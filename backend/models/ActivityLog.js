const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ActivityLog = sequelize.define('ActivityLog', {
    action: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Action type: register | login | create_test | publish_test | start_test | submit_test | delete_test | delete_student | view_analytics'
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User who performed the action'
    },
    userType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'student or staff'
    },
    details: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional context: testId, testName, score, etc.'
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Client IP address'
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Browser user agent string'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'When the action occurred'
    }
}, {
    indexes: [
        { fields: ['action'] },
        { fields: ['username'] },
        { fields: ['timestamp'] },
        { fields: ['userType'] }
    ]
});

module.exports = ActivityLog;
