const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Register number for students, Staff code for staff'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'DOB (DDMMYYYY) for students, custom password for staff'
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [['student', 'staff']] },
    comment: 'User role: student or staff'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Full name of the user'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Email address'
  },
  profilePic: {
    type: DataTypes.BLOB('long'),
    allowNull: true,
    comment: 'Profile picture as Base64 blob'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Soft delete / deactivation flag'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of last successful login'
  },
  status: {
    type: DataTypes.ENUM('Online', 'Offline', 'Idle'),
    defaultValue: 'Offline',
    comment: 'Real-time online status'
  }
}, {
  indexes: [
    { fields: ['username'], unique: true },
    { fields: ['type'] },
    { fields: ['isActive'] }
  ]
});

module.exports = User;
