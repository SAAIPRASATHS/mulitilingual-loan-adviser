const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const targetEmail = 'raghav.v2024aids@sece.ac.in';

        // 1. Promote/Create the target user as admin
        let user = await User.findOne({ email: targetEmail });
        if (user) {
            user.role = 'admin';
            await user.save();
            console.log(`Promoted existing user ${targetEmail} to admin`);
        } else {
            console.log(`User ${targetEmail} not found. You might need to register first, or I can create a placeholder.`);
            // Creating a placeholder with a default password if it doesn't exist
            // However, usually it's better if the user registers. 
            // I'll just log and let the user know if it's missing.
        }

        // 2. Remove all other borrower accounts
        // We keep admins and agents (unless specified otherwise)
        const result = await User.deleteMany({
            email: { $ne: targetEmail },
            role: 'borrower'
        });
        console.log(`Deleted ${result.deletedCount} other borrower accounts`);

        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanup();
