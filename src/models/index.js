const Passenger = require('./passenger');
const Ticket = require('./ticket');
const BerthAllocation = require('./berth');



Ticket.hasMany(Passenger);
Passenger.belongsTo(Ticket);

Ticket.hasOne(BerthAllocation, { foreignKey: 'ticketId' });
BerthAllocation.belongsTo(Ticket, { foreignKey: 'ticketId' });


module.exports = {
    Passenger,
    Ticket,
    BerthAllocation
};