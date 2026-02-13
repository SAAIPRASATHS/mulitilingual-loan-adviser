const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const path = require('path');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Init Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), message: 'Loan Advisor API is healthy' });
});

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/agents', require('./routes/agents'));

// Base route
app.get('/', (req, res) => {
    res.send('Loan Advisor API is running...');
});

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
