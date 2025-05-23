const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BerthAllocation = sequelize.define('BerthAllocation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    coachNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    berthNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    berthType: {
        type: DataTypes.ENUM('lower', 'middle', 'upper', 'side-lower', 'side-upper'),
        allowNull: false
    },
    isOccupied: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    racOccupancy: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true,
    paranoid: true
});

module.exports = BerthAllocation;