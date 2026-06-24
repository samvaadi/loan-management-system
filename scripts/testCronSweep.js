const pool = require('../config/db');
const { runRepaymentSweep } = require('../workers/repaymentWorker');

(async () => {
    try {
        console.log('Running repayment worker sweep...');
        await runRepaymentSweep();

        const result = await pool.query(
            `SELECT loan_id, remaining_balance, monthly_emi, due_date, status, late_fee_amount
             FROM Active_Loans
             WHERE loan_id IN (92001, 92002)
             ORDER BY loan_id`
        );

        console.log('Post-sweep loan state:');
        console.table(result.rows);
    } catch (err) {
        console.error('Sweep test failed:', err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
