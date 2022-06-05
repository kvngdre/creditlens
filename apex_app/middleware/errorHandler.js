const debug = require('debug')('app:errorHandler');
const { MulterError } = require('multer');
const { FileUploadError } = require('../errors/fileUploadError');

function errorHandler(err, req, res, next) {
  // Catch errors for bad json format.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    debug(err.message);
    return res.status(400).send(`Error in JSON object: ${err.message}.`);
  }

  console.log(err.message, err.stack);
  res.status(500).send('Internal Server Error');

  next();
}

module.exports = errorHandler;
