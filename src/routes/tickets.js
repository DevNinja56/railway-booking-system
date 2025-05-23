const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management
 */

/**
 * @swagger
 * /api/v1/tickets/book:
 *   post:
 *     summary: Book a ticket
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passengers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     age:
 *                       type: integer
 *                     gender:
 *                       type: string
 *                       enum: [male, female, other]
 *     responses:
 *       201:
 *         description: Ticket booked successfully
 *       400:
 *         description: Invalid input
 */
router.post('/book', ticketController.bookTicket);

/**
 * @swagger
 * /api/v1/tickets/cancel/{ticketId}:
 *   post:
 *     summary: Cancel a ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully
 *       404:
 *         description: Ticket not found
 */
router.post('/cancel/:ticketId', ticketController.cancelTicket);

/**
 * @swagger
 * /api/v1/tickets/booked:
 *   get:
 *     summary: Get all booked tickets
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: List of booked tickets
 */
router.get('/booked', ticketController.getBookedTickets);

/**
 * @swagger
 * /api/v1/tickets/available:
 *   get:
 *     summary: Get available tickets
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: Available tickets summary
 */
router.get('/available', ticketController.getAvailableTickets);

module.exports = router;