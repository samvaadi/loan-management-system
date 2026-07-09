const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { ensureAuditLogTable } = require('../utils/auditLogger');

const JWT_SECRET = 'BANK_SUPER_SECRET_KEY_SIGNATURE';
const STATIC_HASH = '$2b$10$IjTSNp05cSPNK91ZFu7k9ujXq3QYS9UyOdRzxWWgu3xJYAvenDzAC'; // bcrypt hash of 'password'

// Core Admins and master admin
const TEST_ADMINS = [
    {
        id: 91002,
        firstName: 'Mock',
        lastName: 'Admin',
        email: 'mock.admin.integration@example.test',
        role: 'admin',
        income: 0,
        creditScore: 700
    },
    {
        id: 91003,
        firstName: 'Mock',
        lastName: 'Master',
        email: 'mock.master.integration@example.test',
        role: 'master_admin',
        income: 0,
        creditScore: 750
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
            status TEXT DEFAULT 'Active',
            predicted_default_prob NUMERIC,
            interest_rate NUMERIC NOT NULL
        );
    `);

    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS due_date DATE;`);
    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';`);
    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC DEFAULT 0;`);
    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS predicted_default_prob NUMERIC;`);
    await pool.query(`ALTER TABLE Active_Loans ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0.0;`);
    await pool.query(`ALTER TABLE Active_Loans ALTER COLUMN interest_rate SET NOT NULL;`);
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin', 'master_admin'));`);

    // Clean up existing records for a pristine seed footprint
    await pool.query(`TRUNCATE TABLE Active_Loans CASCADE;`);
    await pool.query(`TRUNCATE TABLE users CASCADE;`);
};

const generateData = () => {
    const usersList = [];
    const loansList = [];

    // Helper random functions
    const randomRange = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
    const randomIntRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    let userIdx = 91010;
    let loanIdx = 92010;

    // 1. Control Group (30 Standard Safe Borrowers)
    for (let i = 1; i <= 30; i++) {
        const uId = userIdx++;
        const lId = loanIdx++;
        const monthlyIncome = randomRange(55000, 120000);
        const creditScore = randomIntRange(680, 820);
        
        usersList.push({
            user_id: uId,
            first_name: `ControlFirst${i}`,
            last_name: `ControlLast${i}`,
            email: `control.borrower.${i}@example.test`,
            password_hash: STATIC_HASH,
            role: 'customer',
            age: randomIntRange(25, 60),
            monthly_income: monthlyIncome,
            credit_score: creditScore
        });

        const sanctioned = randomRange(30000, 150000);
        const interestRate = randomRange(6.0, 9.5);
        const predictedDefaultProb = randomRange(0.02, 0.15);
        const monthlyEmi = parseFloat((sanctioned / 36).toFixed(2)); 
        
        const daysInFuture = randomIntRange(15, 30);

        loansList.push({
            loan_id: lId,
            user_id: uId,
            sanctioned_amount: sanctioned,
            remaining_balance: sanctioned,
            monthly_emi: monthlyEmi,
            due_date_expr: `CURRENT_DATE + INTERVAL '${daysInFuture} days'`,
            status: 'Active',
            late_fee_amount: 0,
            predicted_default_prob: predictedDefaultProb,
            interest_rate: interestRate
        });
    }

    // 2. Delinquency Group (5 Immediate Worker Targets)
    for (let i = 1; i <= 5; i++) {
        const uId = userIdx++;
        const lId = loanIdx++;
        const monthlyIncome = randomRange(15000, 29000);
        const creditScore = randomIntRange(400, 570);

        usersList.push({
            user_id: uId,
            first_name: `DelinquentFirst${i}`,
            last_name: `DelinquentLast${i}`,
            email: `delinquent.borrower.${i}@example.test`,
            password_hash: STATIC_HASH,
            role: 'customer',
            age: randomIntRange(22, 50),
            monthly_income: monthlyIncome,
            credit_score: creditScore
        });

        const sanctioned = randomRange(20000, 50000);
        const interestRate = randomRange(12.0, 15.0);
        const predictedDefaultProb = randomRange(0.65, 0.90);
        const monthlyEmi = parseFloat((sanctioned / 12).toFixed(2));

        loansList.push({
            loan_id: lId,
            user_id: uId,
            sanctioned_amount: sanctioned,
            remaining_balance: sanctioned,
            monthly_emi: monthlyEmi,
            due_date_expr: `CURRENT_DATE - INTERVAL '5 days'`, 
            status: 'Active',
            late_fee_amount: 0,
            predicted_default_prob: predictedDefaultProb,
            interest_rate: interestRate
        });
    }

    // 3. Grace-Period Group (5 Borderline Accounts)
    for (let i = 1; i <= 5; i++) {
        const uId = userIdx++;
        const lId = loanIdx++;
        const monthlyIncome = randomRange(35000, 50000);
        const creditScore = randomIntRange(600, 670);

        usersList.push({
            user_id: uId,
            first_name: `GraceFirst${i}`,
            last_name: `GraceLast${i}`,
            email: `grace.borrower.${i}@example.test`,
            password_hash: STATIC_HASH,
            role: 'customer',
            age: randomIntRange(25, 55),
            monthly_income: monthlyIncome,
            credit_score: creditScore
        });

        const sanctioned = randomRange(25000, 75000);
        const interestRate = randomRange(9.5, 11.5);
        const predictedDefaultProb = randomRange(0.15, 0.35);
        const monthlyEmi = parseFloat((sanctioned / 24).toFixed(2));

        loansList.push({
            loan_id: lId,
            user_id: uId,
            sanctioned_amount: sanctioned,
            remaining_balance: sanctioned,
            monthly_emi: monthlyEmi,
            due_date_expr: `CURRENT_DATE - INTERVAL '1 day'`, 
            status: 'Active',
            late_fee_amount: 0,
            predicted_default_prob: predictedDefaultProb,
            interest_rate: interestRate
        });
    }

    // 4. Statistical Outliers (2 Fraud Anomaly Targets)
    // Outlier A (Income Fraud)
    const uIdA = userIdx++;
    const lIdA = 92050; // Use static ID to identify outliers easily in printState
    usersList.push({
        user_id: uIdA,
        first_name: 'OutlierIncome',
        last_name: 'Fraudster',
        email: 'income.fraud.outlier@example.test',
        password_hash: STATIC_HASH,
        role: 'customer',
        age: 35,
        monthly_income: 950000,
        credit_score: 500
    });
    loansList.push({
        loan_id: lIdA,
        user_id: uIdA,
        sanctioned_amount: 5000000,
        remaining_balance: 5000000,
        monthly_emi: 150000,
        due_date_expr: `CURRENT_DATE + INTERVAL '20 days'`,
        status: 'Active',
        late_fee_amount: 0,
        predicted_default_prob: 0.75,
        interest_rate: 15.0
    });

    // Outlier B (Sizing Anomaly)
    const uIdB = userIdx++;
    const lIdB = 92051; 
    usersList.push({
        user_id: uIdB,
        first_name: 'OutlierSizing',
        last_name: 'Anomaly',
        email: 'sizing.anomaly.outlier@example.test',
        password_hash: STATIC_HASH,
        role: 'customer',
        age: 40,
        monthly_income: 75000,
        credit_score: 780
    });
    loansList.push({
        loan_id: lIdB,
        user_id: uIdB,
        sanctioned_amount: 12000000,
        remaining_balance: 12000000,
        monthly_emi: 350000,
        due_date_expr: `CURRENT_DATE + INTERVAL '100 days'`,
        status: 'Active',
        late_fee_amount: 0,
        predicted_default_prob: 0.05,
        interest_rate: 6.5
    });

    return { usersList, loansList };
};

const seedUsers = async (usersList) => {
    // first insert the static admins
    for (const admin of TEST_ADMINS) {
        await pool.query(
            `INSERT INTO users (user_id, first_name, last_name, email, password_hash, role, age, monthly_income, credit_score)
             VALUES ($1, $2, $3, $4, $5, $6, 35, $7, $8)
             ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                age = EXCLUDED.age,
                monthly_income = EXCLUDED.monthly_income,
                credit_score = EXCLUDED.credit_score`,
            [admin.id, admin.firstName, admin.lastName, admin.email, STATIC_HASH, admin.role, admin.income, admin.creditScore]
        );
    }

    // then insert all the generated users
    for (const u of usersList) {
        await pool.query(
            `INSERT INTO users (user_id, first_name, last_name, email, password_hash, role, age, monthly_income, credit_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (email) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                age = EXCLUDED.age,
                monthly_income = EXCLUDED.monthly_income,
                credit_score = EXCLUDED.credit_score`,
            [u.user_id, u.first_name, u.last_name, u.email, u.password_hash, u.role, u.age, u.monthly_income, u.credit_score]
        );
    }
};

const seedLoans = async (loansList) => {
    for (const l of loansList) {
        await pool.query(
            `INSERT INTO Active_Loans (
                loan_id, 
                user_id, 
                sanctioned_amount, 
                remaining_balance, 
                monthly_emi, 
                due_date, 
                status, 
                late_fee_amount, 
                predicted_default_prob,
                interest_rate
             )
             VALUES (
                $1, $2, $3, $4, $5, 
                ${l.due_date_expr}, 
                $6, $7, $8, $9
             )
             ON CONFLICT (loan_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                sanctioned_amount = EXCLUDED.sanctioned_amount,
                remaining_balance = EXCLUDED.remaining_balance,
                monthly_emi = EXCLUDED.monthly_emi,
                due_date = EXCLUDED.due_date,
                status = EXCLUDED.status,
                late_fee_amount = EXCLUDED.late_fee_amount,
                predicted_default_prob = EXCLUDED.predicted_default_prob,
                interest_rate = EXCLUDED.interest_rate`,
            [
                l.loan_id,
                l.user_id,
                l.sanctioned_amount,
                l.remaining_balance,
                l.monthly_emi,
                l.status,
                l.late_fee_amount,
                l.predicted_default_prob,
                l.interest_rate
            ]
        );
    }
};

const printState = async () => {
    const userCountResult = await pool.query('SELECT role, count(*) FROM users GROUP BY role');
    const loanCountResult = await pool.query('SELECT status, count(*), sum(sanctioned_amount) as total_sanctioned FROM Active_Loans GROUP BY status');

    console.log('Seeded Users Summary:');
    console.table(userCountResult.rows);
    
    console.log('Seeded Loans Summary:');
    console.table(loanCountResult.rows);

    const outliers = await pool.query(
        `SELECT loan_id, user_id, sanctioned_amount, remaining_balance, predicted_default_prob, interest_rate, due_date
         FROM Active_Loans
         WHERE loan_id IN (92050, 92051)
         ORDER BY loan_id`
    );
    console.log('Seeded Outliers:');
    console.table(outliers.rows);

    console.log('Admin JWT:', jwt.sign({ userId: 91002, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' }));
    console.log('Master Admin JWT:', jwt.sign({ userId: 91003, role: 'master_admin' }, JWT_SECRET, { expiresIn: '1h' }));
};

(async () => {
    try {
        await ensureAuditLogTable();
        await ensureCoreTables();
        const { usersList, loansList } = generateData();
        await seedUsers(usersList);
        await seedLoans(loansList);
        await printState();
    } catch (err) {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
