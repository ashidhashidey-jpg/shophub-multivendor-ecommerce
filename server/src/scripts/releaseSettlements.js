/**
 * Settlement Release Job
 * ----------------------
 *   npm run release-settlements
 *
 * This script finds all order items that are eligible for settlement release
 * (DELIVERED, paid, settlement period elapsed, not already released) and
 * moves the held funds from pending to available balance.
 *
 * Safety guarantees:
 *   - Uses MongoDB transactions for atomicity
 *   - Implements distributed locking to prevent concurrent executions
 *   - Idempotent: checks for existing RELEASE ledger entries before releasing
 *   - Never releases funds for returned, cancelled, refunded, or return-requested items
 *   - Does not modify production data outside of settlement release
 *   - Logs all actions for audit trail
 */

const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../config/db");
const Order = require("../models/Order");
const LedgerEntry = require("../models/LedgerEntry");
const Wallet = require("../models/Wallet");
const { appendEntry } = require("../services/ledgerService");
const { PLATFORM_COMMISSION_RATE, SELLER_SETTLEMENT_DAYS } = require("../config/finance");

/**
 * Lock document to prevent concurrent job executions
 * Uses a dedicated collection with TTL index for automatic cleanup
 */
const LOCK_COLLECTION = "settlement_job_locks";
const LOCK_TTL_SECONDS = 300; // 5 minutes - job should complete well within this

async function ensureLockIndex() {
  const lockCollection = mongoose.connection.db.collection(LOCK_COLLECTION);
  // Create TTL index on acquiredAt field
  await lockCollection.createIndex(
    { acquiredAt: 1 },
    { expireAfterSeconds: LOCK_TTL_SECONDS }
  );
}

async function acquireLock(session) {
  await ensureLockIndex();
  const lockCollection = mongoose.connection.db.collection(LOCK_COLLECTION);
  
  // Try to insert a lock document
  try {
    await lockCollection.insertOne(
      {
        _id: "release_settlements",
        acquiredAt: new Date(),
        processId: process.pid,
        hostname: require("os").hostname(),
      },
      { session }
    );
    return true;
  } catch (err) {
    if (err.code === 11000) {
      // Lock already exists, check if it's stale (older than TTL)
      const existingLock = await lockCollection.findOne({ _id: "release_settlements" }, { session });
      if (existingLock) {
        const lockAge = Date.now() - new Date(existingLock.acquiredAt).getTime();
        if (lockAge > LOCK_TTL_SECONDS * 1000) {
          // Stale lock - remove and retry
          await lockCollection.deleteOne({ _id: "release_settlements" }, { session });
          return acquireLock(session);
        }
      }
      return false;
    }
    throw err;
  }
}

async function releaseLock(session) {
  const lockCollection = mongoose.connection.db.collection(LOCK_COLLECTION);
  await lockCollection.deleteOne({ _id: "release_settlements" }, { session });
}

/**
 * Check if an item is eligible for release
 */
function isItemEligibleForRelease(item, now) {
  if (!item || !item.seller || !item.sellerPayout) return false;
  if (item.status !== "DELIVERED") return false;
  if (!item.settlementEligibleAt) return false;
  if (now < item.settlementEligibleAt) return false;
  if (item.releasedAt) return false;

  const nonReleasableStatuses = [
    "RETURNED",
    "CANCELLED",
    "REFUNDED",
    "RETURN_REQUESTED",
    "REFUND_PENDING",
    "REFUND_FAILED",
  ];
  if (nonReleasableStatuses.includes(item.status)) return false;

  if (!item.sellerPayout || item.sellerPayout <= 0) return false;

  return true;
}

/**
 * Release held funds for a single order item within a transaction
 */
async function releaseHeldFundsForItem(order, item, session) {
  const nonReleasableStatuses = [
    "RETURNED",
    "CANCELLED",
    "REFUNDED",
    "RETURN_REQUESTED",
    "REFUND_PENDING",
    "REFUND_FAILED",
  ];

  // Double-check eligibility within transaction
  if (!isItemEligibleForRelease(item, new Date())) {
    return { success: false, reason: "Item not eligible for release" };
  }

  // Check for existing RELEASE ledger entry (idempotency)
  const existingRelease = await LedgerEntry.findOne({
    seller: item.seller,
    type: "RELEASE",
    orderItem: item._id,
  }).session(session);

  if (existingRelease) {
    // Mark as released on the item for future fast-path checks
    item.releasedAt = existingRelease.createdAt;
    return { success: true, reason: "Already released (idempotent)", releasedAt: item.releasedAt };
  }

  // Verify sufficient pending balance
  const wallet = await Wallet.findOne({ seller: item.seller }).session(session);
  if (!wallet || wallet.pendingBalance < item.sellerPayout) {
    return { success: false, reason: "Insufficient pending balance" };
  }

  // Create RELEASE ledger entry - this moves funds from pending to available
  await appendEntry(
    {
      sellerId: item.seller,
      type: "RELEASE",
      amount: item.sellerPayout,
      order: order._id,
      orderItem: item._id,
      description: `Settlement release: Order ${order._id} item ${item._id}`,
    },
    session
  );

  // Mark item as released
  item.releasedAt = new Date();

  return { success: true, reason: "Released", releasedAt: item.releasedAt };
}

/**
 * Main job function - processes all eligible settlements
 */
async function runSettlementRelease() {
  console.log("=".repeat(60));
  console.log("SETTLEMENT RELEASE JOB STARTED");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Process ID: ${process.pid}`);
  console.log("=".repeat(60));

  await connectDB();
  const session = await mongoose.startSession();

  try {
    // Try to acquire lock
    const lockAcquired = await session.withTransaction(async () => {
      return await acquireLock(session);
    });

    if (!lockAcquired) {
      console.log("❌ Could not acquire lock - another job is running");
      console.log("   If this is unexpected, check for stale locks in the 'settlement_job_locks' collection");
      return { success: false, reason: "Lock not acquired" };
    }

    console.log("✅ Lock acquired");

    // Run the release logic within a transaction
    const result = await session.withTransaction(async () => {
      const now = new Date();
      const nonReleasableStatuses = [
        "RETURNED",
        "CANCELLED",
        "REFUNDED",
        "RETURN_REQUESTED",
        "REFUND_PENDING",
        "REFUND_FAILED",
      ];

      // Find all orders with items eligible for release
      const orders = await Order.find({
        paymentStatus: "PAID",
        "items.status": "DELIVERED",
        "items.settlementEligibleAt": { $ne: null, $lte: now },
        "items.releasedAt": null,
        "items.status": { $nin: nonReleasableStatuses },
      }).session(session);

      console.log(`📦 Found ${orders.length} orders with potentially eligible items`);

      let totalReleased = 0;
      let totalSkipped = 0;
      const errors = [];

      for (const order of orders) {
        for (const item of order.items) {
          if (!isItemEligibleForRelease(item, now)) {
            totalSkipped++;
            continue;
          }

          try {
            const result = await releaseHeldFundsForItem(order, item, session);
            if (result.success) {
              totalReleased++;
              console.log(`   ✅ Released: Order ${order._id}, Item ${item._id}, Seller ${item.seller}, Amount: ${item.sellerPayout}`);
            } else {
              totalSkipped++;
              console.log(`   ⏭️  Skipped: Order ${order._id}, Item ${item._id} - ${result.reason}`);
            }
          } catch (err) {
            totalSkipped++;
            errors.push({ orderId: order._id, itemId: item._id, error: err.message });
            console.error(`   ❌ Error: Order ${order._id}, Item ${item._id} - ${err.message}`);
          }
        }

        // Save order with updated releasedAt timestamps
        await order.save({ session });
      }

      return { releasedCount: totalReleased, skippedCount: totalSkipped, errors };
    });

    console.log("\n" + "=".repeat(60));
    console.log("SETTLEMENT RELEASE JOB COMPLETED");
    console.log(`Released: ${result.releasedCount}`);
    console.log(`Skipped: ${result.skippedCount}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log("=".repeat(60));

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.forEach((e) => console.log(`  - Order ${e.orderId}, Item ${e.itemId}: ${e.error}`));
    }

    return { success: true, ...result };

  } catch (error) {
    console.error("\n❌ JOB FAILED:", error.message);
    return { success: false, error: error.message };
  } finally {
    // Release lock
    try {
      await session.withTransaction(async () => {
        await releaseLock(session);
      });
      console.log("🔓 Lock released");
    } catch (lockError) {
      console.error("⚠️  Failed to release lock:", lockError.message);
    }
    await session.endSession();
    await disconnectDB();
  }
}

// Run if executed directly
if (require.main === module) {
  runSettlementRelease()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

module.exports = { runSettlementRelease, isItemEligibleForRelease, releaseHeldFundsForItem, acquireLock, releaseLock };