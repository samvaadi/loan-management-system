const pool = require('../config/db');

(async () => {
    try {
        const row = await pool.query(
            `SELECT audit_id
             FROM audit_logs
             WHERE user_id = '91002'
             ORDER BY network_timestamp DESC
             LIMIT 1`
        );

        if (row.rows.length === 0) {
            throw new Error('No audit row found for immutability test.');
        }

        const auditId = row.rows[0].audit_id;

        try {
            await pool.query('UPDATE audit_logs SET status_outcome = $1 WHERE audit_id = $2', ['TAMPERED', auditId]);
            console.error('Unexpectedly updated audit row.');
            process.exitCode = 1;
        } catch (err) {
            console.log('UPDATE blocked as expected:', err.message);
        }

        try {
            await pool.query('DELETE FROM audit_logs WHERE audit_id = $1', [auditId]);
            console.error('Unexpectedly deleted audit row.');
            process.exitCode = 1;
        } catch (err) {
            console.log('DELETE blocked as expected:', err.message);
        }
    } catch (err) {
        console.error('Audit immutability test failed:', err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
