const { Sequelize, Transaction } = require('sequelize');

const { BerthAllocation, Passenger, Ticket } = require("../models")
const sequelize = require('../config/db');

// Constants for seat allocation
const MAX_WAITING_LIST = 10;

// Helper function to generate PNR
const generatePNR = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Initialize berths (run once)
const initializeBerths = async () => {
    const transaction = await sequelize.transaction();
    try {
        const berthCount = await BerthAllocation.count({ transaction });

        if (berthCount === 0) {
            // Create confirmed berths (63)
            const confirmedBerths = [];
            for (let coach = 1; coach <= 7; coach++) {
                for (let berth = 1; berth <= 9; berth++) {
                    let berthType;
                    if (berth % 8 === 1 || berth % 8 === 4) berthType = 'lower';
                    else if (berth % 8 === 2 || berth % 8 === 5) berthType = 'middle';
                    else if (berth % 8 === 3 || berth % 8 === 6) berthType = 'upper';
                    else if (berth % 8 === 7) berthType = 'side-lower';
                    else if (berth % 8 === 0) berthType = 'side-upper';

                    confirmedBerths.push({
                        coachNumber: `A${coach}`,
                        berthNumber: `${coach}${berth.toString().padStart(2, '0')}`,
                        berthType,
                        isOccupied: false
                    });
                }
            }

            // Create RAC berths (9 side-lower)
            const racBerths = [];
            for (let i = 1; i <= 9; i++) {
                racBerths.push({
                    coachNumber: 'RAC',
                    berthNumber: `R${i.toString().padStart(2, '0')}`,
                    berthType: 'side-lower',
                    isOccupied: false
                });
            }

            await BerthAllocation.bulkCreate([...confirmedBerths, ...racBerths], { transaction });
            await transaction.commit();
            console.log('Berths initialized successfully');
        }
    } catch (error) {
        await transaction.rollback();
        console.error('Error initializing berths:', error);
    }
};

// Book a ticket
exports.bookTicket = async (req, res, next) => {
    const transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });



    try {
        const { passengers } = req.body;

        if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Passenger details are required' });
        }



        for (const passenger of passengers) {
            if (
                !passenger.name ||
                typeof passenger.name !== 'string' ||
                typeof passenger.age !== 'number' ||
                !['male', 'female', 'other'].includes(passenger.gender)
            ) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Invalid passenger details' });
            }
        }



        // Count adults (age >= 5)
        const adults = passengers.filter(p => p.age >= 5);
        const children = passengers.filter(p => p.age < 5);

        if (adults.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'At least one adult passenger is required' });
        }




        // Check available berths
        const availableConfirmed = await BerthAllocation.count({
            where: {
                coachNumber: { [Sequelize.Op.like]: 'A%' },
                isOccupied: false
            },
            transaction
        });

        const availableRAC = await BerthAllocation.count({
            where: {
                coachNumber: 'RAC',
                isOccupied: false
            },
            transaction
        });



        const waitingListCount = await Ticket.count({
            where: { status: 'waiting' },
            transaction
        });

        let ticketStatus;
        let berthAllocation = null;

        if (availableConfirmed >= adults.length) {
            ticketStatus = 'confirmed';
        } else if (availableRAC * 2 >= adults.length && (availableRAC * 2 + availableConfirmed) >= adults.length) {
            ticketStatus = 'rac';
        } else if (waitingListCount < MAX_WAITING_LIST) {
            ticketStatus = 'waiting';
        } else {
            await transaction.rollback();
            return res.status(400).json({ error: 'No tickets available' });
        }

        // Create ticket
        const ticket = await Ticket.create({
            pnr: generatePNR(),
            status: ticketStatus
        }, { transaction });



        // Add passengers
        await Promise.all(passengers.map(passenger =>
            Passenger.create({
                name: passenger.name,
                age: passenger.age,
                gender: passenger.gender,
                isChild: passenger.age < 5,
                TicketId: ticket.id
            }, { transaction })
        ));



        // Allocate berths if confirmed or RAC
        if (ticketStatus !== 'waiting') {
            const adultsToAllocate = adults.length;
            let allocatedCount = 0;

            // Priority allocation for confirmed tickets
            if (ticketStatus === 'confirmed') {
                // Check for senior citizens or ladies with children
                const hasSeniorCitizen = adults.some(p => p.age >= 60);
                const hasLadyWithChild = adults.some(p =>
                    p.gender === 'female' && children.length > 0
                );

                // Try to allocate lower berths first for priority passengers
                if (hasSeniorCitizen || hasLadyWithChild) {
                    const lowerBerths = await BerthAllocation.findAll({
                        where: {
                            coachNumber: { [Sequelize.Op.like]: 'A%' },
                            berthType: 'lower',
                            isOccupied: false
                        },
                        limit: adultsToAllocate,
                        transaction
                    });

                    if (lowerBerths.length > 0) {
                        for (const berth of lowerBerths) {
                            berth.isOccupied = true;
                            berth.ticketId = ticket.id;
                            await berth.save({ transaction });
                            allocatedCount++;

                            if (allocatedCount >= adultsToAllocate) break;
                        }
                    }
                }
            }


            // Allocate remaining berths
            if (allocatedCount < adultsToAllocate) {
                const berthsToAllocate = adultsToAllocate - allocatedCount;
                let berths;

                if (ticketStatus === 'confirmed') {
                    berths = await BerthAllocation.findAll({
                        where: {
                            coachNumber: { [Sequelize.Op.like]: 'A%' },
                            isOccupied: false
                        },
                        limit: berthsToAllocate,
                        order: [['berthType', 'ASC']], // Prefer lower berths
                        transaction
                    });
                } else if (ticketStatus === 'rac') {
                    let adultsLeft = adultsToAllocate;
                    const racBerths = await BerthAllocation.findAll({
                        where: {
                            coachNumber: 'RAC',
                            isOccupied: false
                        },
                        order: [['berthNumber', 'ASC']],
                        transaction
                    });

                    for (const berth of racBerths) {
                        let assignCount = Math.min(2 - berth.racOccupancy, adultsLeft);
                        berth.racOccupancy += assignCount;
                        if (berth.racOccupancy === 2) berth.isOccupied = true;
                        berth.ticketId = ticket.id;
                        await berth.save({ transaction });
                        adultsLeft -= assignCount;
                        if (adultsLeft <= 0) break;
                    }
                }

                for (const berth of berths) {
                    berth.isOccupied = true;
                    berth.ticketId = ticket.id;
                    await berth.save({ transaction });
                }
            }

            // Update ticket with berth details
            const allocatedBerths = await BerthAllocation.findAll({
                where: { ticketId: ticket.id },
                transaction
            });



            if (allocatedBerths.length > 0) {
                const firstBerth = allocatedBerths[0];
                ticket.coachNumber = firstBerth.coachNumber;
                ticket.berthNumber = firstBerth.berthNumber;
                ticket.berthType = firstBerth.berthType;
                await ticket.save({ transaction });
            }


        }

        await transaction.commit();



        // Fetch complete ticket details
        const completeTicket = await Ticket.findByPk(ticket.id, {
            include: [Passenger, BerthAllocation]
        });



        return res.status(201).json({
            message: 'Ticket booked successfully',
            ticket: completeTicket
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Cancel a ticket
exports.cancelTicket = async (req, res, next) => {
    const transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });

    try {
        const { ticketId } = req.params;

        const ticket = await Ticket.findByPk(ticketId, {
            include: [BerthAllocation],
            transaction
        });



        if (!ticket) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Ticket not found' });
        }



        // Free all berths associated with this ticket
        await BerthAllocation.update(
            { isOccupied: false, ticketId: null },
            { where: { ticketId: ticket.id }, transaction }
        );



        // If you use racOccupancy, also reset it for RAC berths:
        await BerthAllocation.update(
            { racOccupancy: 0 },
            { where: { ticketId: ticket.id, coachNumber: 'RAC' }, transaction }
        );

        const originalStatus = ticket.status;
        ticket.status = 'cancelled';
        await ticket.save({ transaction });

        // Promote RAC to confirmed if possible
        if (originalStatus === 'confirmed') {
            const firstRACTicket = await Ticket.findOne({
                where: { status: 'rac' },
                order: [['createdAt', 'ASC']],
                transaction
            });

            if (firstRACTicket) {
                // Find an available confirmed berth
                const availableBerth = await BerthAllocation.findOne({
                    where: {
                        coachNumber: { [Sequelize.Op.like]: 'A%' },
                        isOccupied: false
                    },
                    order: [['berthType', 'ASC']], // Prefer lower berths
                    transaction
                });

                if (availableBerth) {
                    availableBerth.isOccupied = true;
                    availableBerth.ticketId = firstRACTicket.id;
                    await availableBerth.save({ transaction });

                    firstRACTicket.status = 'confirmed';
                    firstRACTicket.coachNumber = availableBerth.coachNumber;
                    firstRACTicket.berthNumber = availableBerth.berthNumber;
                    firstRACTicket.berthType = availableBerth.berthType;
                    await firstRACTicket.save({ transaction });

                    // Free one RAC berth
                    const racBerth = await BerthAllocation.findOne({
                        where: {
                            coachNumber: 'RAC',
                            ticketId: firstRACTicket.id
                        },
                        transaction
                    });

                    if (racBerth) {
                        racBerth.isOccupied = false;
                        racBerth.ticketId = null;
                        await racBerth.save({ transaction });
                    }
                }
            }
        }

        // Promote waiting list to RAC if possible
        if (ticket.status === 'rac' || ticket.status === 'confirmed') {
            const firstWaitingTicket = await Ticket.findOne({
                where: { status: 'waiting' },
                order: [['createdAt', 'ASC']],
                transaction
            });

            if (firstWaitingTicket) {
                // Find an available RAC berth
                const availableRACBerth = await BerthAllocation.findOne({
                    where: {
                        coachNumber: 'RAC',
                        isOccupied: false
                    },
                    transaction
                });

                if (availableRACBerth) {
                    availableRACBerth.isOccupied = true;
                    availableRACBerth.ticketId = firstWaitingTicket.id;
                    await availableRACBerth.save({ transaction });

                    firstWaitingTicket.status = 'rac';
                    firstWaitingTicket.coachNumber = availableRACBerth.coachNumber;
                    firstWaitingTicket.berthNumber = availableRACBerth.berthNumber;
                    firstWaitingTicket.berthType = availableRACBerth.berthType;
                    await firstWaitingTicket.save({ transaction });
                }
            }
        }

        await transaction.commit();
        res.json({ message: 'Ticket cancelled successfully' });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Get all booked tickets
exports.getBookedTickets = async (req, res, next) => {
    try {
        // Fetch all non-cancelled tickets with their associated data
        const tickets = await Ticket.findAll({
            where: {
                status: {
                    [Sequelize.Op.not]: 'cancelled'
                }
            },
            include: [
                {
                    model: Passenger,
                    attributes: ['id', 'name', 'age', 'gender', 'isChild']
                },
                {
                    model: BerthAllocation,
                    attributes: ['id', 'coachNumber', 'berthNumber', 'berthType']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        // Summary
        const confirmedCount = await Ticket.count({
            where: { status: 'confirmed' }
        });

        const racCount = await Ticket.count({
            where: { status: 'rac' }
        });

        const waitingCount = await Ticket.count({
            where: { status: 'waiting' }
        });

        res.json({
            tickets,
            summary: {
                confirmed: confirmedCount,
                rac: racCount,
                waiting: waitingCount,
                total: confirmedCount + racCount + waitingCount
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get available tickets
exports.getAvailableTickets = async (req, res, next) => {
    try {

        const availableConfirmed = await BerthAllocation.count({
            where: {
                coachNumber: { [Sequelize.Op.like]: 'A%' },
                isOccupied: false
            }
        });


        const availableRAC = await BerthAllocation.count({
            where: {
                coachNumber: 'RAC',
                isOccupied: false
            }
        });



        const waitingListCount = await Ticket.count({
            where: { status: 'waiting' }
        });




        const availableWaiting = MAX_WAITING_LIST - waitingListCount;


        res.json({
            available: {
                confirmed: availableConfirmed,
                rac: availableRAC,
                waiting: availableWaiting > 0 ? availableWaiting : 0
            }
        });
    } catch (error) {
        next(error);
    }
};

// Initialize berths on startup
initializeBerths();