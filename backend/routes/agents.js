const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const AgentProfile = require('../models/AgentProfile');
const LoanApplication = require('../models/LoanApplication');

// @desc    Get agent dashboard stats
// @route   GET /api/agents/dashboard
// @access  Private (Agent only)
router.get('/dashboard', protect, async (req, res) => {
    try {
        if (req.user.role !== 'agent' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Agent/Admin role required.' });
        }

        const agentProfile = await AgentProfile.findOne({ user: req.user._id });

        // Admin sees all leads, Agent sees theirs + unassigned
        const query = req.user.role === 'admin' ? {} : {
            $or: [
                { agent: req.user._id },
                { agent: { $exists: false } },
                { agent: null }
            ]
        };

        const leads = await LoanApplication.find(query)
            .populate('user', 'name email phone')
            .populate('loan', 'name loanType');

        res.json({
            profile: agentProfile,
            leads: leads,
            stats: {
                totalLeads: leads.length,
                approvedLeads: leads.filter(l => l.status === 'approved').length,
                pendingLeads: leads.filter(l => ['submitted', 'under-review'].includes(l.status)).length
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Submit a new loan lead
// @route   POST /api/agents/leads
// @access  Private (Agent only)
router.post('/leads', protect, async (req, res) => {
    try {
        if (req.user.role !== 'agent' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Agent or Admin role required.' });
        }

        const { borrowerId, loanId, requestedAmount, requestedTenure, purpose } = req.body;

        if (!mongoose.Types.ObjectId.isValid(borrowerId)) {
            return res.status(400).json({ message: 'Invalid Borrower ID format' });
        }
        if (!mongoose.Types.ObjectId.isValid(loanId)) {
            return res.status(400).json({ message: 'Invalid Loan ID format' });
        }

        const application = await LoanApplication.create({
            user: borrowerId,
            loan: loanId,
            agent: req.user._id,
            isAgentSubmission: true,
            requestedAmount,
            requestedTenure,
            purpose,
            status: 'submitted'
        });

        // Update agent stats
        await AgentProfile.findOneAndUpdate(
            { user: req.user._id },
            { $inc: { totalLeadsSubmitted: 1 } }
        );

        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register agent profile
// @route   POST /api/agents/profile
// @access  Private (Agent only)
router.post('/profile', protect, async (req, res) => {
    try {
        if (req.user.role !== 'agent' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Agent or Admin role required.' });
        }

        const { agencyName, licenseNumber, experience, specializations } = req.body;

        const profileExists = await AgentProfile.findOne({ user: req.user._id });
        if (profileExists) {
            return res.status(400).json({ message: 'Agent profile already exists' });
        }

        const agentProfile = await AgentProfile.create({
            user: req.user._id,
            agencyName,
            licenseNumber,
            experience,
            specializations
        });

        res.status(201).json(agentProfile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get single lead details
// @route   GET /api/agents/leads/:id
// @access  Private (Agent only)
router.get('/leads/:id', protect, async (req, res) => {
    try {
        if (req.user.role !== 'agent' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Agent or Admin role required.' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Application ID format' });
        }

        const application = await LoanApplication.findById(req.params.id)
            .populate('user', 'name email phone financialProfile')
            .populate('loan', 'name loanType interestRate loanAmount tenure eligibilityCriteria')
            .populate('reviewedBy', 'name email');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Approve or reject a loan application
// @route   PUT /api/agents/leads/:id/review
// @access  Private (Agent only)
router.put('/leads/:id/review', protect, async (req, res) => {
    try {
        if (req.user.role !== 'agent' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Agent or Admin role required.' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Application ID format' });
        }

        const { action, remarks, approvedAmount, interestRate } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
        }

        const application = await LoanApplication.findById(req.params.id)
            .populate('user', 'name email')
            .populate('loan', 'name loanType');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.status === 'approved' || application.status === 'rejected') {
            return res.status(400).json({ message: `Application already ${application.status}` });
        }

        application.status = action === 'approve' ? 'approved' : 'rejected';
        application.reviewedBy = req.user._id;
        application.reviewedAt = new Date();
        application.agent = req.user._id;

        if (action === 'approve') {
            application.approvedAmount = approvedAmount || application.requestedAmount;
            application.interestRate = interestRate || null;
        } else {
            application.rejectionReason = remarks || 'Application rejected by agent';
        }

        if (remarks) {
            application.remarks.push({
                message: remarks,
                createdBy: req.user.name || 'Agent',
                createdAt: new Date()
            });
        }

        await application.save();

        // Send email notification
        try {
            const Loan = require('../models/Loan');
            const loanData = await Loan.findById(application.loan);
            if (action === 'approve') {
                const { sendLoanApprovalEmail } = require('../services/emailService');
                sendLoanApprovalEmail(application, application.user, loanData);
            }
        } catch (emailErr) {
            console.error('Email notification failed:', emailErr.message);
        }

        // Update agent stats
        if (action === 'approve') {
            await AgentProfile.findOneAndUpdate(
                { user: req.user._id },
                { $inc: { leadsApproved: 1 } }
            );
        }

        res.json({ message: `Application ${application.status} successfully`, application });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Run AI document analysis on application
// @route   POST /api/agents/leads/:id/analyze-documents
// @access  Private (Agent only)
router.post('/leads/:id/analyze-documents', protect, async (req, res) => {
    try {
        if (req.user.role !== 'agent' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Agent or Admin role required.' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Application ID format' });
        }

        const application = await LoanApplication.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('loan', 'name loanType');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (!application.documents || application.documents.length === 0) {
            return res.status(400).json({ message: 'No documents uploaded for this application' });
        }

        // Build document summary for AI analysis
        const docSummary = application.documents.map(d =>
            `- Type: ${d.documentType}, File: ${d.fileName}, Uploaded: ${d.uploadedAt}`
        ).join('\n');

        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const analysisPrompt = `You are a Senior Loan Underwriter. Perform a rigorous, LOGICALLY CONSISTENT financial analysis.

APPLICANT DATA:
- Name: ${application.user?.name || 'N/A'}
- Monthly Income (I): ₹${application.monthlyIncome || 0}
- Credit Score: ${application.creditScore || 0}
- Requested Loan (L): ₹${application.requestedAmount || 0}
- Loan Purpose: ${application.purpose || 'N/A'}
- Documents: ${docSummary}

BANKING INDUSTRY STANDARDS (Multipliers):
- Low Risk: L/I is 1x to 12x (Repayable in 1 year)
- Moderate Risk: L/I is 13x to 48x
- High Normal: L/I is 49x to 60x (Typical bank limit)
- Extreme/Suspicious: L/I > 60x (e.g., ₹500k loan on ₹4k income is 125x)

LOGIC CHECK RULES:
1. CONSISTENCY: A higher income applicant MUST have a lower or equal risk score compared to a lower income applicant for the same loan amount.
2. VERDICT LOGIC: If income is ₹50,000 and loan is ₹500,000, that is only 10x multiplier. This is mathematically VERY SAFE and must be 'genuine'.
3. MULTIPLIER MATH: Calculate M = L / I. If M <= 60, the financial ratio is standard.

OUTPUT (JSON ONLY):
{
  "calculations": "Explain L/I multiplier math...",
  "logic_verification": "Compare against banking standards...",
  "verdict": "genuine" | "suspicious" | "inconclusive",
  "risk_score": 1-10,
  "details": "Professional explanation for the human agent"
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a financial logic AI. Output ONLY JSON. No thinking blocks, no markdown. Mathematical consistency is your #1 priority." },
                { role: "user", content: analysisPrompt }
            ],
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            temperature: 0.0,
            max_tokens: 1024
        });

        let aiResponse = chatCompletion.choices[0].message.content.trim();

        // Basic JSON cleaning if necessary (some models still add ```json)
        aiResponse = aiResponse.replace(/^```json/, '').replace(/```$/, '').trim();

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(aiResponse);
        } catch (e) {
            console.error('AI JSON Parse Error, falling back to string search:', e.message);
            // Fallback parsing if JSON fails
            parsedResponse = {
                verdict: aiResponse.toLowerCase().includes('suspicious') ? 'suspicious' :
                    aiResponse.toLowerCase().includes('genuine') ? 'genuine' : 'inconclusive',
                details: aiResponse,
                risk_score: 5
            };
        }

        application.documentAnalysis = {
            isAnalyzed: true,
            analysisResult: parsedResponse.verdict,
            analysisDetails: parsedResponse.calculations ?
                `CALCULATIONS: ${parsedResponse.calculations}\n\nLOGIC CHECK: ${parsedResponse.logic_verification}\n\nSUMMARY: ${parsedResponse.details}` :
                parsedResponse.details,
            analyzedAt: new Date()
        };

        await application.save();

        res.json({
            verdict: parsedResponse.verdict,
            details: application.documentAnalysis.analysisDetails,
            analyzedAt: application.documentAnalysis.analyzedAt
        });
    } catch (error) {
        console.error('Document analysis error:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
