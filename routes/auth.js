const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Change this line:
const JWT_SECRET = process.env.JWT_SECRET;

// User Registration
router.post('/register', async (req, res) => {
    const { first_name, last_name, email, password, age, monthly_income } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, age, monthly_income, role, credit_score) 
             VALUES ($1, $2, $3, $4, $5, $6, 'customer', 650) RETURNING user_id, role`,
            [first_name, last_name, email, hashedPassword, age || 25, monthly_income]
        );
        const token = jwt.sign({ userId: result.rows[0].user_id, role: result.rows[0].role }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ success: true, token, role: result.rows[0].role });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Email registration failed. The account may already exist.' });
    }
});

// User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'User profile account not located.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid password authorization key.' });
        }

        const token = jwt.sign({ userId: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ success: true, token, role: user.role, name: `${user.first_name} ${user.last_name}` });
    } catch (err) {
        console.error("Authentication router engine fault:", err);
        res.status(500).json({ success: false, error: 'Internal security database error.' });
    }
});

module.exports = router;