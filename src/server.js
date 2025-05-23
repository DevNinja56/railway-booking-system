require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 4000;

// Verify DB connection on startup
const sequelize = require('./config/db');

sequelize.authenticate()
    .then(() => {
        console.log('Database connection established');
        sequelize.sync()
            .then(() => console.log('Database synced'))
            .catch(err => console.error('Database sync error:', err));
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to database:', err);
        process.exit(1);
    });