/**
 * Lightweight email service.
 * In development it logs emails to the console so the pipeline stays
 * self-contained. Swap the send() implementation with a real provider
 * (Nodemailer / SendGrid / SES) for production without changing callers.
 */

const send = async ({ to, subject, html, text }) => {
  const payload = { to, subject, html: html || undefined, text: text || undefined };
  console.log(`[email-service] Sending email to ${to}`);
  console.log(`[email-service] Subject: ${subject}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("[email-service] (dev preview):", payload);
  }
  return { sent: true, preview: true };
};

const sendSellerApproved = (email, storeName) =>
  send({
    to: email,
    subject: "Your seller account has been approved",
    text: `Congratulations! Your store "${storeName}" has been approved. You can now manage products and orders.`,
  });

const sendSellerRejected = (email, storeName, reason) =>
  send({
    to: email,
    subject: "Your seller application was not approved",
    text: `Your store "${storeName}" was rejected${reason ? `: ${reason}` : ""}.`,
  });

const sendOrderConfirmation = (email, orderId, total) =>
  send({
    to: email,
    subject: `Order ${orderId} confirmed`,
    text: `Your order ${orderId} for Rs. ${total} has been placed successfully.`,
  });

module.exports = { send, sendSellerApproved, sendSellerRejected, sendOrderConfirmation };