const http = require('http');
const jwt = require('jsonwebtoken');
const appPool = require('../config/db');

const JWT_SECRET = 'BANK_SUPER_SECRET_KEY_SIGNATURE';
const token = jwt.sign({ userId: 91002, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

const postMutation = () => new Promise((resolve, reject) => {
    const payload = JSON.stringify({ application_id: 999999, action: 'Reject' });
    const req = http.request({
        hostname: 'localhost',
        port: process.env.PORT || 5000,
        path: '/api/admin/evaluate-action',
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            resolve({ statusCode: res.statusCode, body });
        });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
});

(async () => {
    try {
        const response = await postMutation();
        console.log('Admin mutation response:', response);

        await new Promise((resolve) => setTimeout(resolve, 500));
        const logs = await appPool.query(
            `SELECT audit_id, user_id, endpoint_path, status_outcome, network_timestamp
             FROM audit_logs
             WHERE user_id = '91002'
             ORDER BY network_timestamp DESC
             LIMIT 5`
        );
        console.log('Recent audit rows for admin user 91002:');
        console.table(logs.rows);
    } catch (err) {
        console.error('Audit mutation test failed:', err);
        process.exitCode = 1;
    } finally {
        await appPool.end();
    }
})();
