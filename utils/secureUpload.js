const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const SECURE_UPLOAD_DIR = path.resolve(__dirname, '../secure_uploads');
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const EXTENSIONS_BY_MIME = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const ensureSecureUploadDir = () => {
    fs.mkdirSync(SECURE_UPLOAD_DIR, { recursive: true });
};

const createSecureFilename = (file) => {
    const extension = EXTENSIONS_BY_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const digest = crypto
        .createHash('sha256')
        .update(`${file.fieldname}:${file.originalname}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`)
        .digest('hex');

    return `${file.fieldname}_${digest}${extension}`;
};

const secureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureSecureUploadDir();
        cb(null, SECURE_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, createSecureFilename(file));
    }
});

const documentFileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }

    cb(null, true);
};

const secureDocumentUpload = multer({
    storage: secureStorage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: documentFileFilter
});

const handleUploadError = (err, req, res, next) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'Security Block: document assets must not exceed 5MB.'
            : 'Security Block: unsupported document upload payload.';

        return res.status(400).json({ success: false, error: message });
    }

    return res.status(400).json({ success: false, error: 'Security Block: document upload rejected.' });
};

module.exports = {
    ALLOWED_MIME_TYPES,
    SECURE_UPLOAD_DIR,
    secureDocumentUpload,
    handleUploadError
};
