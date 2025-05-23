const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pnr: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('confirmed', 'rac', 'waiting', 'cancelled'),
        allowNull: false
    },
    coachNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    berthNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    berthType: {
        type: DataTypes.ENUM('lower', 'middle', 'upper', 'side-lower', 'side-upper'),
        allowNull: true
    }
}, {
    timestamps: true,
    paranoid: true
});

module.exports = Ticket;