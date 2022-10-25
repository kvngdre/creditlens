const config = require('config');
const debug = require('debug')('app:verifyToken');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger')('verifyToken.js');

function verifyToken(req, res, next) {
    try {
        const authHeader =
            req.header('authorization') || req.header('Authorization');
        if (!authHeader) return res.sendStatus(401);

        const [scheme, token] = authHeader.split(' ');
        if (scheme !== 'Bearer') return res.sendStatus(401);
        if (!token)
            return res.status(401).send('Access Denied. No token provided.');

        const decoded = jwt.verify(token, config.get('jwt.secret.access'));
        if (
            decoded.iss !== config.get('jwt.issuer') ||
            decoded.aud !== config.get('jwt.audience.token')
        ) {
            return res.status(401).send('Invalid token provided.');
        }
        req.user = decoded;

        next();
    } catch (exception) {
        debug(exception);
        return res.status(403).send(exception.message);
    }
}

module.exports = verifyToken;
