const config = require('config');


module.exports = function () {
    try{
        // Check for jwt Private key
        config.get("jwtPrivateKey");

    }catch(exception) {
        console.error('FATAL ERROR: jwtPrivateKey not set.');
        process.exit(1);
    };

};