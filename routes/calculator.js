const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Pull Public Schemes
router.get('/schemes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Bank_Schemes ORDER BY scheme_id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to pull schemes catalog records.' });
    }
});

// Evaluate Loan Feasibility
router.post('/evaluate', async (req, res) => {
    const scheme_id = parseInt(req.body.scheme_id, 10);
    const income = parseFloat(req.body.income) || 0;
    const amount = parseFloat(req.body.amount) || 0;
    const tenure = parseInt(req.body.tenure, 10) || 0;

    try {
        const schemeRes = await pool.query('SELECT * FROM Bank_Schemes WHERE scheme_id = $1', [scheme_id]);
        if (schemeRes.rows.length === 0) return res.status(400).json({ error: 'Invalid Scheme Selected' });
        
        const scheme = schemeRes.rows[0];
        const schemeMinIncome = parseFloat(scheme.min_income_required);
        const schemeInterestRate = parseFloat(scheme.interest_rate);

        if (income < schemeMinIncome) {
            return res.json({ feasible: false, reason: `Income falls below product baseline: ₹${schemeMinIncome.toLocaleString('en-IN')}.` });
        }
        
        const r = (schemeInterestRate / 100) / 12; 
        const emi = amount * r * Math.pow(1 + r, tenure) / (Math.pow(1 + r, tenure) - 1);
        const maxEmi = income * 0.50; 
        
        if (isNaN(emi) || !isFinite(emi)) {
            return res.json({ feasible: false, reason: 'Mathematical boundary limits error.' });
        }

        if (emi > maxEmi) {
            return res.json({ feasible: false, reason: `Calculated EMI (₹${emi.toFixed(2)}) breaks maximum 50% FOIR safety limit (Allowed: ₹${maxEmi.toFixed(2)}).` });
        }

        res.json({ feasible: true, emi: emi.toFixed(2), rate: schemeInterestRate });
    } catch (err) {
        console.error("Calculator internal processing fault:", err);
        res.status(500).json({ error: 'Calculator internal pipeline error.' });
    }
});

module.exports = router;