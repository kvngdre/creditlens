const _ = require('lodash');
const { DateTime } = require('luxon');
const Loan = require('../models/loanModel');
const debug = require('debug')('app:loanCtrl');
const lenderController = require('./lenderController');
const logger = require('../utils/logger')('loanCtrl.js');
const loanManager = require('../tools/Managers/loanManager');
const { LoanRequestValidators } = require('../validators/loanValidator');

// Get Loan Validators.
async function getValidator(params) {
    try{
        const user = params.hasOwnProperty('user') ? params.user : null;
        const payload = params.hasOwnProperty('payload') ? params.payload : null;
        const customerSegment = params.hasOwnProperty('customerSegment') ? params.customerSegment : null;

        const { data: { loanParams, segments } } = await lenderController.getConfig(user.lenderId);
        const { minLoanAmount, maxLoanAmount, minTenor, maxTenor, maxDti } = segments.find(
            segment => segment.id === (customerSegment ? customerSegment.toString() : payload.employmentInfo.segment)
        );

        const payloadValidator = new LoanRequestValidators(
            loanParams.minNetPay,
            minLoanAmount,
            maxLoanAmount,
            minTenor,
            maxTenor
        );


        console.log('maxDti', maxDti);
        return { loanParams, payloadValidator };

    }catch(exception) {
        logger.error({ message: `getValidator - ${exception.message}`, meta: exception.stack });
        debug(exception);
        return exception;
    };
};

const loans = {
    createLoanRequest: async function (user, payload) {
        try{
            // if(request.user.role === 'guest') request.user.lenderId = request.params.id;

            const customerPayload = _.omit(payload, ['loan']);
            const loanPayload = payload.loan;
    
            const validator = await getValidator({ user, payload: customerPayload });
            if(validator instanceof Error) {
                logger.error({ message: 'Error fetching loan and segment configurations.', meta: { userId: user.id, lenderId: user.lenderId } });
                return { errorCode: 424, message: 'Unable to fetch loan and segment configurations.' };
            }

            const { loanParams, payloadValidator } = validator;
    
            const { error } = payloadValidator.loanRequestCreation(loanPayload)
            if(error)return { errorCode: 400, message: error.details[0].message };
    
            const response = await loanManager.createLoanRequest(
                user,
                loanParams,
                customerPayload,
                loanPayload
            );
    
            return response;

        }catch(exception) {
            logger.error({ message: exception.message, meta: exception.stack });
            debug(exception);
            return { errorCode: 500, message: 'Something went wrong.'};
        }
    },

    createLoan: async function (customer, loanMetricsObj, request) {
        const newLoan = await loanManager.createLoan(
            customer,
            loanMetricsObj,
            request
        );

        return newLoan;
    },

    getAll: async function (user, filters) {
        let loans = [];
        let queryParams = { lenderId: user.lenderId };

        if (user.role === 'Loan Agent') {
            queryParams.loanAgent = user.id;
            loans = await loanManager.getAll(queryParams);
        } else {
            queryParams = Object.assign(
                queryParams,
                _.omit(filters, ['date', 'amount', 'tenor'])
            );

            // Date Filter - createdAt
            if (filters.date?.start)
                queryParams.createdAt = {
                    $gte: DateTime.fromJSDate(new Date(filters.date.start))
                        .setZone(user.timeZone)
                        .toUTC(),
                };
            if (filters.date?.end) {
                const target = queryParams.createdAt
                    ? queryParams.createdAt
                    : {};
                queryParams.createdAt = Object.assign(target, {
                    $lte: DateTime.fromJSDate(new Date(filters.date.end))
                        .setZone(user.timeZone)
                        .toUTC(),
                });
            }

            // Number Filter - amount
            if (filters.amount?.min)
                queryParams.recommendedAmount = { $gte: filters.amount.min };
            if (filters.amount?.max) {
                const target = queryParams.recommendedAmount
                    ? queryParams.recommendedAmount
                    : {};
                queryParams.recommendedAmount = Object.assign(target, {
                    $lte: filters.amount.max,
                });
            }

            //
            if (filters.tenor?.min)
                queryParams.recommendedTenor = { $gte: filters.tenor.min };
            if (filters.tenor?.max) {
                const target = queryParams.recommendedTenor
                    ? queryParams.recommendedTenor
                    : {};
                queryParams.recommendedTenor = Object.assign(target, {
                    $lte: filters.tenor.max,
                });
            }

            loans = await loanManager.getAll(queryParams);
        }

        return loans;
    },

    getOne: async function (user, id) {
        let loan = null;
        const queryParams = { _id: id, lenderId: user.lenderId };

        if (user.role === 'Loan Agent') {
            queryParams.loanAgent = user.id;
            loan = await loanManager.getOne(queryParams);
        } else loan = await loanManager.getOne(queryParams);

        return loan;
    },

    update: async function (id, user, payload) {
        try{
            const queryParams = { _id: id, lenderId: user.lenderId, status: { $nin: ['Matured', 'Completed'] }};
    
            const loan = await Loan.findOne(queryParams);
            if(!loan) return { errorCode: 404, message: 'Loan document not found.' };

            // Get Validator
            const {customer: {employmentInfo: { segment: { _id } }}} = loan;
            const { payloadValidator } = await getValidator({ user: req.user, payload: req.body, customerSegment: _id.toString() });
    
            const { error } = payloadValidator.validateEdit(req.body)
            if(error) return { errorCode: 400, message: error.details[0].message };
            
            return await loanManager.edit(user, loan, payload);

        }catch(exception) {
            debug(exception);
            return { errorCode: 500, message: 'Something went wrong.' };
        }
    },

    getDisbursement: async function (user, requestBody) {
        // TODO: handle end date on the controller function
        let queryParams = {
            lenderId: user.lenderId,
            active: true,
            disbursed: false,
            status: 'Approved',
        };

        queryParams = Object.assign(
            queryParams,
            _.omit(requestBody, ['start', 'end'])
        );
        if (requestBody.start)
            queryParams.createdAt = {
                $gte: requestBody.start,
                $lt: requestBody.end ? requestBody.end : '2122-01-01',
            };

        return await loanManager.getDisbursement(user, queryParams);
    },

    getLoanBooking: async function (request) {
        request.body.active = true;
        request.body.booked = false;
        request.body.status = 'Approved';
        request.body.lenderId = request.user.lenderId;
        request.body.createdAt = { $gte: new Date(request.body.fromDate) };

        return await loanManager.getLoanBooking(request.body);
    },

    expiring: async function () {
        return await loanManager.closeExpiringLoans();
    },
};

module.exports = loans;
