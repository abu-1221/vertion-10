/**
 * Render.com Root Entry Point (Activation fix)
 * This file starts the backend server regardless of directory structure.
 */
const app = require('./backend/server.js');
const sequelize = require('./backend/database.js');
const PORT = process.env.PORT || 3000;

// Explicitly start the server
sequelize.sync().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 JMC Placement Portal is LIVE on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Database sync failed:', err);
  process.exit(1);
});
