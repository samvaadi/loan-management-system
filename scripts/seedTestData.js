const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { ensureAuditLogTable } = require('../utils/auditLogger');

const JWT_SECRET = 'BANK_SUPER_SECRET_KEY_SIGNATURE';

const TEST_USERS = [
    {
        id: 91001,
        firstName: 'Mock',
        lastName: 'Customer',
        email: 'mock.customer.integration@example.test',
        role: 'customer',
        income: 85000
    },
    {
        id: 91002,
        firstName: 'Mock',
        lastName: 'Admin',
        email: 'mock.admin.integration@example.test',
        role: 'admin',
        income: 0
    },
    {
        id: 91003,
        firstName: 'Mock',
        lastName: 'Master',
        email: 'mock.master.integration@example.test',
        role: 'master_admin',
        income: 0
    }
];

const ensureCoreTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            age INTEGER DEFAULT 30,
            monthly_income NUMERIC DEFAULT 0,
            credit_score INTEGER DEFAULT 650
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS Active_Loans (
            loan_id INTEGER PRIMARY KEY,
            user_id INTEGER,
            sanctioned_amount NUMERIC DEFAULT 0,
            remaining_balance NUMERIC DEFAULT 0,
            monthly_emi NUMERIC DEFAULT 0,
            due_date DATE,
            status TEXT DEFAULT 'Active'
        );
    `);

    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS due_date DATE;`);
    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';`);
    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC DEFAULT 0;`);
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin', 'master_admin'));`);
};

const seedUsers = async () => {
    for (const user of TEST_USERS) {
        await pool.query(
            `INSERT INTO users (user_id, first_name, last_name, email, password_hash, role, age, monthly_income, credit_score)
             VALUES ($1, $2, $3, $4, 'integration-test-hash', $5, 35, $6, 720)
             ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                age = EXCLUDED.age,
                monthly_income = EXCLUDED.monthly_income,
                credit_score = EXCLUDED.credit_score
             RETURNING user_id, email, role`,
            [user.id, user.firstName, user.lastName, user.email, user.role, user.income]
        );
    }
};

const seedLoans = async () => {
    await pool.query(
        `INSERT INTO Active_Loans (loan_id, user_id, sanctioned_amount, remaining_balance, monthly_emi, due_date, status, late_fee_amount)
         VALUES
            (92001, 91001, 100000, 50000, 5000, CURRENT_DATE - INTERVAL '1 day', 'Active', 0),
            (92002, 91001, 200000, 80000, 7500, CURRENT_DATE - INTERVAL '5 days', 'Active', 0)
         ON CONFLICT (loan_id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            sanctioned_amount = EXCLUDED.sanctioned_amount,
            remaining_balance = EXCLUDED.remaining_balance,
            monthly_emi = EXCLUDED.monthly_emi,
            due_date = EXCLUDED.due_date,
            status = EXCLUDED.status,
            late_fee_amount = EXCLUDED.late_fee_amount`
    );
};

const printState = async () => {
    const users = await pool.query(
        `SELECT user_id, email, role
         FROM users
         WHERE email LIKE 'mock.%integration@example.test'
         ORDER BY user_id`
    );
    const loans = await pool.query(
        `SELECT loan_id, user_id, remaining_balance, monthly_emi, due_date, status, late_fee_amount
         FROM Active_Loans
         WHERE loan_id IN (92001, 92002)
         ORDER BY loan_id`
    );

    console.log('Seeded users:');
    console.table(users.rows);
    console.log('Seeded active loans:');
    console.table(loans.rows);
    console.log('Admin JWT:', jwt.sign({ userId: 91002, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' }));
    console.log('Master Admin JWT:', jwt.sign({ userId: 91003, role: 'master_admin' }, JWT_SECRET, { expiresIn: '1h' }));
};

(async () => {
    try {
        await ensureAuditLogTable();
        await ensureCoreTables();
        await seedUsers();
        await seedLoans();
        await printState();
    } catch (err) {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
