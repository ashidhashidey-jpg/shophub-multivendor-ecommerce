const { authenticate } = require('./authMiddleware')
const { authorizeRoles } = require('./roleMiddleware')
const { loadSeller, requireApprovedSeller } = require('./sellerMiddleware')

module.exports = {
  authenticate,
  authorizeRoles,
  loadSeller,
  requireApprovedSeller
}
