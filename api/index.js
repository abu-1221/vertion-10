const app = require('../backend/server.js');
const sequelize = require('../backend/database');

// Ensure database tables are created on first cold start
let dbReady = false;
const originalHandler = app;

module.exports = async (req, res) => {
  if (!dbReady) {
    try {
      await sequelize.sync();
      dbReady = true;
      console.log('[Vercel] Database synced successfully');
    } catch (err) {
      console.error('[Vercel] Database sync error:', err.message);
    }
  }
  return originalHandler(req, res);
};
