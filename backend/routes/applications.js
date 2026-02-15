const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const LoanApplication = require('../models/LoanApplication');
const Loan = require('../models/Loan');
const { sendLoanApprovalEmail } = require('../services/emailService');


const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// @desc    Create new loan application
// @route   POST /api/applications
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const {
            loanId, requestedAmount, requestedTenure, purpose,
            borrowerAge, monthlyIncome, creditScore,
            hasCollateral, collateralDetails, requirementsMet
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(loanId)) {
            return res.status(400).json({ message: 'Invalid Loan ID format' });
        }

        // Fetch loan details for validation
        const loanData = await Loan.findById(loanId);
        if (!loanData) {
            return res.status(404).json({ message: 'Loan product not found' });
        }

        // Automatic Approval Logic
        const crit = loanData.eligibilityCriteria;
        const ageValid = borrowerAge >= crit.minAge && (crit.maxAge ? borrowerAge <= crit.maxAge : true);
        const incomeValid = monthlyIncome >= crit.minIncome;
        const creditValid = creditScore >= (crit.minCreditScore || 0);
        const docsValid = requirementsMet && requirementsMet.identityVerified && requirementsMet.incomeVerified;

        const isApproved = ageValid && incomeValid && creditValid && docsValid;

        const application = await LoanApplication.create({
            user: req.user._id,
            loan: loanId,
            requestedAmount,
            requestedTenure,
            purpose,
            borrowerAge,
            monthlyIncome,
            creditScore,
            hasCollateral,
            collateralDetails,
            requirementsMet,
            status: isApproved ? 'approved' : 'submitted',
            eligibilityDetails: {
                ageEligible: ageValid,
                incomeEligible: incomeValid,
                creditScoreEligible: creditValid,
                employmentEligible: true, // Simplified for now
                existingLoansEligible: true
            }
        });

        // Send email if approved
        if (isApproved) {
            // req.user might not have all details if it's just from protect middleware
            // but usually it's populated there. 
            sendLoanApprovalEmail(application, req.user, loanData);
        }

        res.status(201).json(application);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's loan applications
// @route   GET /api/applications/my-applications
// @access  Private
router.get('/my-applications', protect, async (req, res) => {
    try {
        const applications = await LoanApplication.find({ user: req.user._id })
            .populate('loan', 'name loanType interestRate');
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Upload documents for application
// @route   POST /api/applications/:id/upload
// @access  Private
router.post('/:id/upload', protect, upload.single('document'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid Application ID format' });
    }
    try {
        const application = await LoanApplication.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        application.documents.push({
            documentType: req.body.documentType,
            fileName: req.file.filename,
            filePath: req.file.path
        });

        await application.save();
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a loan application
// @route   DELETE /api/applications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Application ID format' });
        }

        const application = await LoanApplication.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check if user is authorized:
        // 1. User is the borrower who created it
        // 2. User is the assigned agent
        // 3. User is an agent and the lead is unassigned (visible in dashboard)
        // 4. User is an admin
        const isOwner = application.user.toString() === req.user._id.toString();
        const isAgent = application.agent && application.agent.toString() === req.user._id.toString();
        const isUnassignedAgent = req.user.role === 'agent' && !application.agent;

        if (!isOwner && !isAgent && !isUnassignedAgent && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this application' });
        }

        await LoanApplication.findByIdAndDelete(req.params.id);

        res.json({ message: 'Application removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
