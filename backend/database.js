const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
  // Use cloud database (e.g. Supabase Postgres or Cloud MySQL)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DB_DIALECT || 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for Neon and other cloud DBs
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false
  });
} else if (process.env.MYSQL_DATABASE || process.env.USE_MYSQL === 'true') {
  // Use MySQL explicitly if requested via env vars (requires mysql2 installed)
  sequelize = new Sequelize(
      process.env.MYSQL_DATABASE || 'jmc_placement',
      process.env.MYSQL_USER || 'root',
      process.env.MYSQL_PASSWORD || '',
      {
        host: process.env.MYSQL_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
      }
  );
} else {
  // Local development fallback to guarantee Zero-Crash/Zero-Defect rule
  const path = require('path');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'jmc_placement_portal.sqlite'),
    logging: false
  });
}

module.exports = sequelize;
