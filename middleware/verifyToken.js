const config = require('config');
const debug = require('debug')('app:verifyToken');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger')('verifyToken.js');

function verifyToken(req, res, next) {
    try {
        // const [scheme, token] = req.header('auth-token').split(' ') || req.header('Authorization').split(' ');
        const token = req.header('auth-token') || req.header('Authorization')

        // if(scheme !== 'Bearer') return res.status(401).send('Invalid token provided.');

        if (!token)
            return res.status(401).send('Access Denied. No token provided.');

        const isVerified = jwt.verify(token, config.get('jwt.secret.access'));

        req.user = isVerified;

        next();
    } catch (exception) {
        logger.error({method: 'verifyToken', message: exception.message, meta: exception.stack });
        debug(exception.message);
        return res.status(403).send('Invalid token provided.');
    }
}

module.exports = verifyToken;
