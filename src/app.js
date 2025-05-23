const express = require('express');
require('./config/db');
require("./models");

const errorHandler = require('./middlewares/errorHandler');

const ticketRoutes = require('./routes/tickets');
// Add these lines:

const { swaggerUi, swaggerSpec } = require('./swagger');

const app = express();

// Middleware
app.use(express.json());

// Swagger docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/tickets', ticketRoutes); app.use('/api/v1/tickets', ticketRoutes);

// Error handling



module.exports = app; app.use(errorHandler); app.use(errorHandler);

module.exports = app;