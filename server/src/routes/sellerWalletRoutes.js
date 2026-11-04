const walletRoutes = require('./walletRoutes')
const withdrawalRoutes = require('./withdrawalRoutes')

// Mount under sellers namespace for simplicity
module.exports = {
  walletRoutes,
  withdrawalRoutes
}
