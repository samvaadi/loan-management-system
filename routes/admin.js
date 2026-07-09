const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { secureDocumentUpload, handleUploadError } = require('../utils/secureUpload');
const { auditAdminMutation, ensureAuditLogTable } = require('../utils/auditLogger');
require('dotenv').config();

ensureAuditLogTable().catch((err) => {
    console.error('Audit log table initialization fault:', err);
});

// Get Metrics Overview
router.get('/metrics', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const ledgerMetricsQuery = `SELECT COALESCE(SUM(sanctioned_amount), 0) AS total_disbursed, COALESCE(SUM(remaining_balance), 0) AS total_exposure, COUNT(*) AS active_loan_count FROM Active_Loans;`;
        const ledgerRes = await pool.query(ledgerMetricsQuery);

        const applicationMetricsQuery = `SELECT COUNT(*) AS total_apps, COUNT(CASE WHEN status = 'Approved' THEN 1 END) AS approved_apps FROM Loan_Applications;`;
        const appRes = await pool.query(applicationMetricsQuery);

        const totalApps = parseInt(appRes.rows[0].total_apps, 10);
        const conversionRate = totalApps > 0 ? ((parseInt(appRes.rows[0].approved_apps, 10) / totalApps) * 100).toFixed(1) : '0.0';

        res.json({
            totalDisbursed: ledgerRes.rows[0].total_disbursed,
            totalExposure: ledgerRes.rows[0].total_exposure,
            activeLoans: ledgerRes.rows[0].active_loan_count,
            conversionRate: conversionRate
        });
    } catch (err) {
        res.status(500).json({ error: 'Analytics compilation failure.' });
    }
});

// View Processing Queue
router.get('/queue', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const query = `
            SELECT la.application_id, u.first_name || ' ' || u.last_name AS name, u.monthly_income, s.scheme_name, la.amount_applied, la.tenure_months, la.status
            FROM Loan_Applications la JOIN users u ON la.user_id = u.user_id JOIN Bank_Schemes s ON la.scheme_id = s.scheme_id WHERE la.status = 'Pending';`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to pull admin queue.' });
    }
});

// Evaluate Action (Approve/Reject)
router.post('/evaluate-action', verifyToken, verifyAdmin, auditAdminMutation, async (req, res) => {
    const { application_id, action } = req.body;
    try {
        if (action === 'Approve') {
            await pool.query('CALL ProcessLoanApproval($1)', [application_id]);
            res.json({ success: true, message: 'Automated policy audits passed. Loan portfolio activated.' });
        } else {
            await pool.query("UPDATE Loan_Applications SET status = 'Rejected' WHERE application_id = $1", [application_id]);
            res.json({ success: true, message: 'Application marked as Rejected.' });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Provision Employee Credentials
router.post('/create-credentials', verifyToken, verifyAdmin, auditAdminMutation, async (req, res) => {
    if (req.user.role !== 'master_admin') {
        return res.status(403).json({ success: false, error: 'Access Denied: Administrative account provisioning privileges are strictly restricted to Master Admin accounts.' });
    }

    const { first_name, last_name, email, password } = req.body;
    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ success: false, error: 'All fields are mandatory.' });
    }
    try {
        const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) return res.status(400).json({ success: false, error: 'Account already exists.' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, role, age, monthly_income) VALUES ($1, $2, $3, $4, 'admin', 30, 0.00)`,
            [first_name, last_name, email, passwordHash]
        );
        res.json({ success: true, message: `Credentials for ${first_name} compiled cleanly onto ledger.` });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal fault during admin creation.' });
    }
});

// Administrative Compliance Document Intake
router.post('/documents', verifyToken, verifyAdmin, auditAdminMutation, secureDocumentUpload.array('documents', 10), handleUploadError, async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No compliance documents supplied.' });
    }

    res.json({
        success: true,
        documents: req.files.map((file) => ({
            field: file.fieldname,
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            size: file.size
        }))
    });
});

// Master Admin Audit Log Dashboard Feed
router.get('/audit-logs', verifyToken, verifyAdmin, async (req, res) => {
    if (req.user.role !== 'master_admin') {
        return res.status(403).json({ success: false, error: 'Audit log retrieval is restricted to Master Admin accounts.' });
    }

    try {
        await ensureAuditLogTable();
        const result = await pool.query(
            `SELECT audit_id, user_id, network_timestamp, endpoint_path, status_outcome
             FROM audit_logs
             ORDER BY network_timestamp DESC
             LIMIT 250`
        );
        res.json({ success: true, logs: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Audit log retrieval failed.' });
    }
});

module.exports = router;