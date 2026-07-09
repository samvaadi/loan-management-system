const pool = require('../config/db');

const ACTIVE_LOANS_TABLE = 'active_loans';
const GRACE_PERIOD_DAYS = parseInt(process.env.EMI_GRACE_PERIOD_DAYS || '3', 10);
const LATE_FEE_RATE = parseFloat(process.env.EMI_LATE_FEE_RATE || '0.02');

const pickColumn = (columns, candidates) => candidates.find((column) => columns.has(column));

const getActiveLoanColumns = async () => {
    const result = await pool.query(
        `SELECT lower(column_name) AS column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND lower(table_name) = $1`,
        [ACTIVE_LOANS_TABLE]
    );

    return new Set(result.rows.map((row) => row.column_name));
};

const processDueEmis = async (client, columns) => {
    const idColumn = pickColumn(columns, ['loan_id', 'active_loan_id', 'id']);
    const dueDateColumn = pickColumn(columns, ['next_due_date', 'emi_due_date', 'due_date', 'next_payment_date', 'payment_due_date']);
    const remainingBalanceColumn = pickColumn(columns, ['remaining_balance', 'outstanding_balance']);
    const emiColumn = pickColumn(columns, ['monthly_emi', 'emi_amount']);
    const lastPaymentColumn = pickColumn(columns, ['last_payment_date', 'last_emi_paid_at']);

    if (!idColumn || !dueDateColumn || !remainingBalanceColumn || !emiColumn) {
        console.warn('[repayment-worker] Missing Active_Loans EMI columns; due EMI processing skipped.');
        return 0;
    }

    const setClauses = [
        `${remainingBalanceColumn} = GREATEST(${remainingBalanceColumn} - ${emiColumn}, 0)`,
        `${dueDateColumn} = (${dueDateColumn}::date + INTERVAL '1 month')::date`
    ];

    if (lastPaymentColumn) {
        setClauses.push(`${lastPaymentColumn} = CURRENT_DATE`);
    }

    const result = await client.query(`
        UPDATE Active_Loans
        SET ${setClauses.join(', ')}
        WHERE ${dueDateColumn}::date = CURRENT_DATE
          AND ${remainingBalanceColumn} > 0
        RETURNING ${idColumn}
    `);

    return result.rowCount;
};

const markDelinquentLoans = async (client, columns) => {
    const idColumn = pickColumn(columns, ['loan_id', 'active_loan_id', 'id']);
    const dueDateColumn = pickColumn(columns, ['next_due_date', 'emi_due_date', 'due_date', 'next_payment_date', 'payment_due_date']);
    const remainingBalanceColumn = pickColumn(columns, ['remaining_balance', 'outstanding_balance']);
    const statusColumn = pickColumn(columns, ['status', 'loan_status']);
    const lateFeeColumn = pickColumn(columns, ['late_fee_balance', 'late_fee_amount', 'penalty_amount']);

    if (!idColumn || !dueDateColumn || !remainingBalanceColumn || !statusColumn) {
        console.warn('[repayment-worker] Missing Active_Loans delinquency columns; delinquency processing skipped.');
        return 0;
    }

    const setClauses = [
        `${statusColumn} = 'Delinquent'`,
        `${remainingBalanceColumn} = ROUND((${remainingBalanceColumn} * (1 + $1::numeric))::numeric, 2)`
    ];

    if (lateFeeColumn) {
        setClauses.push(`${lateFeeColumn} = COALESCE(${lateFeeColumn}, 0) + ROUND((${remainingBalanceColumn} * $1::numeric)::numeric, 2)`);
    }

    const result = await client.query(`
        UPDATE Active_Loans
        SET ${setClauses.join(', ')}
        WHERE ${dueDateColumn}::date < (CURRENT_DATE - ($2::int * INTERVAL '1 day'))
          AND ${remainingBalanceColumn} > 0
          AND COALESCE(${statusColumn}, '') <> 'Delinquent'
        RETURNING ${idColumn}
    `, [LATE_FEE_RATE, GRACE_PERIOD_DAYS]);

    return result.rowCount;
};

const runRepaymentSweep = async () => {
    const client = await pool.connect();

    try {
        const columns = await getActiveLoanColumns();
        await client.query('BEGIN');

        const processedEmis = await processDueEmis(client, columns);
        const delinquentLoans = await markDelinquentLoans(client, columns);

        await client.query('COMMIT');
        console.log(`[repayment-worker] Sweep complete. EMI deductions: ${processedEmis}; delinquency updates: ${delinquentLoans}.`);
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[repayment-worker] Sweep failed:', err);
    } finally {
        client.release();
    }
};

module.exports = {
    runRepaymentSweep
};

if (require.main === module) {
    runRepaymentSweep()
        .then(() => {
            console.log('[repayment-worker] Execution complete.');
            pool.end();
        })
        .catch((err) => {
            console.error('[repayment-worker] Direct execution sweep failed:', err);
            pool.end();
        });
}
