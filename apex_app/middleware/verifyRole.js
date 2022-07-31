/**
 * Grants or denies user access to resource 
 * @param {String|Array} role 
 * @returns 
 */
function verifyRole(role) {
    if(Array.isArray(role)) {
        return (req, res, next) => {
            if(!role.includes(req.user.role)) return res.status(401).send('Access Denied');

            next();
        };
    };

    return (req, res, next) => {
        if(req.user.role !== role) {
            return res.status(401).send('Access Denied');
        }
        next();
    };
};

module.exports = verifyRole;