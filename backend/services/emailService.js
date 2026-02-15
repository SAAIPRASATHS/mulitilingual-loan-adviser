const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a loan approval notification to the admin.
 * @param {Object} applicationData - The loan application details.
 * @param {Object} userData - The user who applied for the loan.
 * @param {Object} loanData - The loan product details.
 */
const sendLoanApprovalEmail = async (applicationData, userData, loanData) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;

        if (!adminEmail) {
            console.error('ADMIN_EMAIL is not defined in environment variables.');
            return;
        }

        const { data, error } = await resend.emails.send({
            from: 'Loan Advisor <onboarding@resend.dev>',
            to: adminEmail,
            subject: 'Loan Application Approved Automatically',
            html: `
                <h1>Loan Approved Automatically</h1>
                <p>A new loan application has been automatically approved based on the eligibility criteria.</p>
                <hr />
                <h3>Borrower Details:</h3>
                <ul>
                    <li><strong>Name:</strong> ${userData.name}</li>
                    <li><strong>Email:</strong> ${userData.email}</li>
                    <li><strong>Phone:</strong> ${userData.phone}</li>
                </ul>
                <h3>Loan Details:</h3>
                <ul>
                    <li><strong>Loan Product:</strong> ${loanData.name}</li>
                    <li><strong>Requested Amount:</strong> ₹${applicationData.requestedAmount}</li>
                    <li><strong>Requested Tenure:</strong> ${applicationData.requestedTenure} months</li>
                    <li><strong>Purpose:</strong> ${applicationData.purpose}</li>
                </ul>
                <h3>Financial Profile:</h3>
                <ul>
                    <li><strong>Monthly Income:</strong> ₹${applicationData.monthlyIncome}</li>
                    <li><strong>Credit Score:</strong> ${applicationData.creditScore}</li>
                    <li><strong>Age:</strong> ${applicationData.borrowerAge}</li>
                </ul>
                <p>The application status has been updated to <strong>'approved'</strong>.</p>
            `,
        });

        if (error) {
            console.error('Error sending email via Resend:', error);
        } else {
            console.log('Email sent successfully:', data.id);
        }
    } catch (error) {
        console.error('Failed to send loan approval email:', error.message);
    }
};

module.exports = {
    sendLoanApprovalEmail
};
