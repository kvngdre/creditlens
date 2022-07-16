const _ = require('lodash');
const debug = require('debug')('app:txnCtrl');
const Transaction = require('../models/transactionModel');

const transactionFuncs = {
    create: async function(requestBody) {
        try{
            const newTransaction = await Transaction.create(requestBody);
            return newTransaction;

        }catch(exception) {
            debug(exception);
            return exception;
        }
    },

    getOne: async function(id, user) {
        try{
            const queryParams = {lenderId: user.lenderId, _id: id};

            const transaction = await Transaction.findOne( queryParams );
            if(!transaction) throw new Error('Transaction not found');

            return transaction;

        }catch(exception) {
            debug(exception);
            return exception;
        }
    },

    getAll: async function(user, requestBody) {
        try{
            let queryParams = { lenderId: user.lenderId };

            queryParams = Object.assign(queryParams, _.omit(requestBody, ['start', 'end']));
            if(requestBody.start) queryParams.createdAt = { $gte: requestBody.start, $lt: (requestBody.end ? requestBody.end : "2122-01-01") };

            const transactions = await Transaction.find( queryParams );
            if(transactions.length === 0) throw new Error('No transactions found');

            return transactions;

        }catch(exception) {
            debug(exception);
            return exception;
        };
    }
}

module.exports = transactionFuncs;