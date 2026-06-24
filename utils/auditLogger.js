const pool = require('../config/db');

const ensureAuditLogTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            audit_id BIGSERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            network_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            endpoint_path TEXT NOT NULL,
            status_outcome TEXT NOT NULL
        );
    `);

    await pool.query(`
        CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'audit_logs is immutable';
        END;
        $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_trigger
                WHERE tgname = 'audit_logs_prevent_update_delete'
            ) THEN
                CREATE TRIGGER audit_logs_prevent_update_delete
                BEFORE UPDATE OR DELETE ON audit_logs
                FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
            END IF;
        END $$;
    `);
};

const writeAuditLog = async ({ userId, endpointPath, statusOutcome }) => {
    await ensureAuditLogTable();
    await pool.query(
        `INSERT INTO audit_logs (user_id, endpoint_path, status_outcome)
         VALUES ($1, $2, $3)`,
        [String(userId || 'unknown'), endpointPath, statusOutcome]
    );
};

const auditAdminMutation = (req, res, next) => {
    const endpointPath = req.originalUrl || req.path;

    res.on('finish', () => {
        const statusOutcome = res.statusCode < 400 ? 'SUCCESS' : `FAILED_${res.statusCode}`;
        writeAuditLog({
            userId: req.user && (req.user.userId || req.user.id || req.user.sub),
            endpointPath,
            statusOutcome
        }).catch((err) => {
            console.error('Audit logging fault:', err);
        });
    });

    next();
};

module.exports = {
    auditAdminMutation,
    ensureAuditLogTable,
    writeAuditLog
};
