const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authenticateJWT(req, res, next) {
    console.log('🔐 Auth middleware - Method:', req.method);
    console.log('🔐 Auth middleware - URL:', req.url);
    console.log('🔐 Auth middleware - Origin:', req.headers.origin);
    
    // Skip authentication for OPTIONS requests (preflight)
    if (req.method === 'OPTIONS') {
        console.log('🔐 Auth middleware - Skipping auth for OPTIONS request');
        return next();
    }
    
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth middleware - Auth header present:', !!authHeader);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        console.log('🔐 Auth middleware - Token extracted, length:', token.length);
        
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                console.log("🔐 Auth middleware - TOKEN INVALIDO:", err.message);
                return res.status(403).json({ error: 'Token inválido' });
            }
            console.log('🔐 Auth middleware - Token valid for user:', user.username || user.id);
            req.user = user;
            next();
        });
    } else {
        console.log('🔐 Auth middleware - No valid auth header, rejecting');
        res.status(401).json({ error: 'No autorizado, token requerido' });
    }
}

module.exports = authenticateJWT;
