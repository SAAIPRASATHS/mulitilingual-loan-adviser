const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const targetEmail = 'raghav.v2024aids@sece.ac.in';
        const user = await User.findOne({ email: targetEmail });
        if (user) {
            console.log(`Status of ${targetEmail}: Role=${user.role}, ID=${user._id}`);
        } else {
            console.log(`User ${targetEmail} NOT FOUND in database.`);
        }
        await mongoose.connection.close();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

check();
