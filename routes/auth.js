const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                console.log("TOKEN INVALIDO")
                return res.status(403).json({ error: 'Token inválido' });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: 'No autorizado, token requerido' });
    }
}

module.exports = authenticateJWT;
