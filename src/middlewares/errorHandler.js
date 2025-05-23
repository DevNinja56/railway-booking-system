const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors.map(e => e.message)
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            error: 'Duplicate entry',
            details: err.errors.map(e => e.message)
        });
    }

    res.status(500).json({ error: 'Something went wrong' });
};

module.exports = errorHandler;