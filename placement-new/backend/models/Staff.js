const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const Staff = sequelize.define('Staff', {
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
    staffCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Official Staff ID / Code'
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Assigned Department'
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Official Position / Title'
    }
}, {
    tableName: 'Staff', // Force name because 'Staff' is plural enough
    indexes: [
        { fields: ['staffCode'], unique: true },
        { fields: ['department'] }
    ]
});

module.exports = Staff;
