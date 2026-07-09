const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/portfolio-yield', verifyToken, authorizeRoles('admin', 'master_admin'), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Active_Loans');
        const loans = result.rows;
        const n = loans.length;

        // 1. Risk-Adjusted Revenue Forecast
        let totalRiskAdjustedRevenue = 0;
        const processedLoans = loans.map(loan => {
            const remainingBalance = parseFloat(loan.remaining_balance) || 0;
            const interestRate = parseFloat(loan.interest_rate) || 0;
            const predictedDefaultProb = parseFloat(loan.predicted_default_prob) || 0;
            
            const riskAdjustedRevenue = remainingBalance * (interestRate / 100) * (1 - predictedDefaultProb);
            totalRiskAdjustedRevenue += riskAdjustedRevenue;
            
            return {
                ...loan,
                remaining_balance: remainingBalance,
                interest_rate: interestRate,
                predicted_default_prob: predictedDefaultProb,
                riskAdjustedRevenue
            };
        });

        // 2. Anomaly Flags (Fraud Detection)
        const sanctionedAmounts = loans.map(loan => parseFloat(loan.sanctioned_amount) || 0);
        const averageSanctioned = n > 0 ? sanctionedAmounts.reduce((a, b) => a + b, 0) / n : 0;

        let stdDev = 0;
        if (n > 0) {
            const variance = sanctionedAmounts.reduce((sum, val) => sum + Math.pow(val - averageSanctioned, 2), 0) / n;
            stdDev = Math.sqrt(variance);
        }

        const threshold3Sigma = averageSanctioned + (3 * stdDev);

        // Flag any loan where sanctioned amount > threshold3Sigma
        const anomalies = processedLoans.filter(loan => loan.sanctioned_amount > threshold3Sigma);

        res.json({
            success: true,
            totalRiskAdjustedRevenue,
            anomalies: anomalies.map(loan => ({
                loan_id: loan.loan_id,
                user_id: loan.user_id,
                sanctioned_amount: loan.sanctioned_amount,
                remaining_balance: loan.remaining_balance,
                interest_rate: loan.interest_rate,
                predicted_default_prob: loan.predicted_default_prob,
                status: loan.status
            }))
        });
    } catch (err) {
        console.error('Portfolio yield calculation failure:', err);
        res.status(500).json({ success: false, error: 'Portfolio yield calculation failure.' });
    }
});

module.exports = router;
