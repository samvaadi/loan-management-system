const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ success: false, error: "Access Denied." });

    try {
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
        const decoded = jwt.verify(cleanToken, 'BANK_SUPER_SECRET_KEY_SIGNATURE');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: "Invalid session." });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user && ['admin', 'master_admin'].includes(req.user.role)) {
        next();
    } else {
        return res.status(403).json({ success: false, error: "Administrative privileges required." });
    }
};

// Ensure this object structure is pristine at the bottom of the file!
module.exports = { verifyToken, verifyAdmin };