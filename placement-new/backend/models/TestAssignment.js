const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const TestAssignment = sequelize.define('TestAssignment', {
    testId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'FK to Test.id'
    },
    studentUsername: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'FK to User.username (student)'
    },
    status: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'submitted'),
        defaultValue: 'not_started',
        comment: 'Assignment lifecycle status'
    },
    assignedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'When the test was assigned to this student'
    },
    startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the student started the test'
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the student submitted the test'
    }
}, {
    indexes: [
        { fields: ['testId', 'studentUsername'], unique: true },
        { fields: ['studentUsername'] },
        { fields: ['status'] },
        { fields: ['testId'] }
    ]
});

module.exports = TestAssignment;
