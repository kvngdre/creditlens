require('dotenv').config({path: require('path').resolve(__dirname, './.env')});
require('express-async-errors');
require('./startUp/config')();
require('./startUp/db')();

const app = require('express')();
const config = require('config');
const jobs = require('./jobs/jobs');
const appRoutes = require('./startUp/routes');
const debug = require('debug')('app:startUp');
// const { 
//     firebaseConfig, 
//     initializeApp, 
//     getMessaging 
// } = require('./startUp/firebase-cm');


// Setup
appRoutes(app);
// jobs();
// const fcm_app = initializeApp(firebaseConfig);
// const messaging = getMessaging(fcm_app)
// messaging.getToken({vapidKey: "BEYkETs_arnU_0Er49Z5O-ZBv24aE_HEtoN8xWEJSOyilwODbb4uC51S7-TPePrixvOwIjDDXGgYHqe2p06Ydjw"})

const port = config.get('server.port')
app.listen(port, () => debug(`Listening on port:[${port}]`));