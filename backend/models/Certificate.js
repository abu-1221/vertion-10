const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const Certificate = sequelize.define('Certificate', {
    studentUsername: {
        type: DataTypes.STRING,
        allowNull: false
    },
    testId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    certificateType: {
        type: DataTypes.STRING,
        defaultValue: 'merit', // merit, participation, transcript
        validate: { isIn: [['merit', 'participation', 'transcript']] }
    },
    issueDate: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    },
    serialNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSON, // { score, testName, company }
        allowNull: true
    }
});

module.exports = Certificate;
