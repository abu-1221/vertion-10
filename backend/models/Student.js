const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const Student = sequelize.define('Student', {
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Link to base User record'
    },
    registerNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'University Register Number'
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Academic Department'
    },
    year: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Current Year of Study (1, 2, 3, 4)'
    },
    section: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Class Section (A, B, C, etc.)'
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Male / Female'
    },
    batch: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Academic Batch (e.g., 2022-2026)'
    },
    streamType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'UG / PG'
    },
    dob: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Date of Birth (YYYY-MM-DD)'
    }
}, {
    indexes: [
        { fields: ['registerNumber'], unique: true },
        { fields: ['department'] },
        { fields: ['year'] },
        { fields: ['batch'] }
    ]
});

module.exports = Student;
