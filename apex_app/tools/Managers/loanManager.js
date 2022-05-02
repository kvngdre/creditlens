require('dotenv').config();
const _ = require('lodash');
const debug = require('debug')('app:loanMgr')
const Bank = require('../../models/bankModel');
const Loan = require('../../models/loanModel');
const Customer = require('../../models/customerModel');
const pickRandomUser = require('../../utils/pickRandomAgent');
const userController = require('../../controllers/userController');
const convertToDotNotation = require('../../utils/convertToDotNotation');
const customerController = require('../../controllers/customerController');
const PendingEditController = require('../../controllers/pendingEditController');


const manager = {
    createLoan: async function(customer, loanMetricsObj, request) {
        try{
            const loan = await Loan.find( { customer: customer._id, lenderId: request.user.lenderId, active: true } )
                                   .sort( { createdAt: -1 } )
                                   .limit(1);
            
            let agent
            if(loan.length === 0) {
                agent = await pickRandomUser(request.user.lenderId, 'loanAgent', customer.employmentInfo.segment);
            }else{
                agent = await userController.get( { _id: loan[0].loanAgent } );
                request.body.loanType = "topUp";
            };

            if(!agent) {
                debug(agent);
                throw new Error('Invalid loan agent.');
            };

            const creditOfficer = await pickRandomUser(request.user.lenderId, 'credit', customer.employmentInfo.segment);
            if(!creditOfficer){
                debug(creditOfficer);
                throw new Error('Could not assign credit officer.');
            };

            request.body.lenderId = request.user.lenderId;
            request.body.loanAgent = agent._id;
            request.body.creditOfficer = creditOfficer._id;
            request.body.interestRate = loanMetricsObj.interestRate;
            request.body.upfrontFeePercentage = loanMetricsObj.upfrontFeePercentage;
            request.body.transferFee = loanMetricsObj.transferFee;
            request.body.validationParams = {dob: customer.dateOfBirth};
            request.body.validationParams.doe = customer.employmentInfo.dateOfEnlistment;
            request.body.validationParams.minNetPay = loanMetricsObj.minNetPay;
            request.body.validationParams.dtiThreshold = loanMetricsObj.dtiThreshold;
            
            const newLoan = await Loan.create( request.body );

            return newLoan;

        }catch(exception) {
            return exception;
        };
    },

    // TODO: write func for validating ippis 
    createLoanRequest: async function(loanMetricsObj, request) {
        try{
            if(request.user.role === 'guest') {
                const lender = await Lender.findOne( { slug: request.body.slug } );
                request.user.lenderId = lender._id;
            };

            let customer;
            customer = await customerController.get(request.user, { 'employmentInfo.ippis': request.body.employmentInfo.ippis } );   
            if(customer.message && customer.stack) {
                // if customer does not exist.
                customer = await customerController.create( _.omit(request, ['body.loan']) );
                if(customer instanceof Error) throw customer;
            };

            const loan = await Loan.find( { customer: customer._id, lenderId: request.user.lenderId } )
                                    .sort( { createdAt: -1 } )
                                    .limit(1);
            
            let agent;
            if(loan.length === 0) {
                agent = await pickRandomUser(request.user.lenderId, 'loanAgent', customer.employmentInfo.segment)
            }else{
                agent = await userController.get( { _id: loan[0].loanAgent } );
                request.body.loan.loanType = "topUp";
            };
            
            if(!agent) {
                debug(agent);
                throw new Error('Invalid loan agent.');
            };

            // Picking credit officer
            let creditOfficer = await pickRandomUser(request.user.lenderId, 'credit', customer.employmentInfo.segment);
            if(!creditOfficer){
                debug(creditOfficer);
                throw new Error('Could not assign credit officer.');
            };

            // TODO: Make this a transaction
            request.body.loan.lenderId = request.user.lenderId;
            request.body.loan.customer = customer._id;
            request.body.loan.loanAgent = agent._id;
            request.body.loan.creditOfficer = creditOfficer._id;
            request.body.loan.interestRate = loanMetricsObj.interestRate;
            request.body.loan.upfrontFeePercentage = loanMetricsObj.upfrontFeePercentage;
            request.body.loan.transferFee = loanMetricsObj.transferFee;
            request.body.loan.validationParams = {dob: customer.dateOfBirth};
            request.body.loan.validationParams.doe = customer.employmentInfo.dateOfEnlistment;
            request.body.loan.validationParams.minNetPay = loanMetricsObj.minNetPay;
            request.body.loan.validationParams.dtiThreshold = loanMetricsObj.dtiThreshold;            
            
            const newLoan = await Loan.create(request.body.loan);
            
            await newLoan.save();
            
            return {customer, loan: newLoan};

        }catch(exception) {
            return exception;
        };
    },

    getAll: async function(user, queryParam={}) {
        console.log(user.lenderId)
        queryParam.lenderId = user.lenderId;

        if(user.role !== 'loanAgent') {
            const loans = await Loan.find( queryParam )
                                    .select('_id status amount recommendedAmount tenor recommendedTenor customer createdAt netPay dateAppOrDec lenderId')
                                    .select('-lenderId')
                                    .populate({path: 'customer', model: Customer, select: 'name employmentInfo.ippis'})
                                    .sort( { createdAt: -1 } );
            
            return loans;
        };

        queryParam.loanAgent = user.id
        const loans = await Loan.find( queryParam )
                                .sort('_id');
            
        return loans; 
    },

    getDisbursement: async function(user, queryParam={}) {
        queryParam.lenderId = user.lenderId;

        if(user.role !== 'loanAgent') {
            const loans = await Loan.find( queryParam )
                                    .select('_id customer recommendedAmount recommendedTenor interestRate repayment netPay upfrontFee transferFee netValue totalRepayment metrics.debtToIncomeRatio.value status createdAt dateAppOrDec lenderId')
                                    .populate({path: 'customer', model: Customer, populate:[{path:'accountInfo.bank', model: Bank, select: '-_id name'}], select: '-_id bvn employmentInfo.ippis accountInfo'})                                    
                                    .sort({createdAt: -1});
            
            return loans;
        };

        queryParam.loanAgent = user.id
        const loans = await Loan.find( queryParam )
                                .sort('_id');
            
        return loans; 
    },

    getOne: async function(user, queryParam) {
        queryParam.lenderId = user.lenderId;
        console.log('manager=======', queryParam);
        if(user.role !== 'loanAgent') {
            const loan = await Loan.findOne( queryParam )
                                   .populate({path: 'customer', model: Customer});

            return loan;
        };

        queryParam.loanAgent = user.id;
        const loan = await Loan.findOne( queryParam )
                               .populate({path: 'customer', model: Customer});

        return loan;
    },

    edit: async function(request) {
        try{ 
            request.body = convertToDotNotation(request.body);
            
            if(request.user.role === 'loanAgent'){
                const result = await Loan.findOne({ 
                    _id: request.params.id, 
                    loanAgent: request.user.id, 
                    lenderId: request.user.lenderId 
                });
                if(!result) throw new Error('loan not found.');

                const newPendingEdit = await PendingEditController.create(request.user, request.params.id, 'loan', request.body);
                if(!newPendingEdit || newPendingEdit instanceof Error) {
                    debug(newPendingEdit);
                    throw newPendingEdit;
                };

                return {
                    message: 'Submitted. Awaiting Review.',
                    alteration: newPendingEdit
                }
            }

            const loan = await Loan.findOne({ 
                _id: request.params.id, 
                lenderId: request.user.lenderId 
            });
            if(!loan) throw new Error('loan not found.');

            if(['approved', 'declined'].includes(request.body?.status)) {
                loan.set('dateAppOrDec', Date.now());
            };

            loan.set(request.body);
            await loan.save();
        
            return loan;

        }catch(exception) {
            debug(exception);
            return exception;
        };
    },

    closeExpiringLoans: async function() {
        const today = new Date().toLocaleDateString();
        console.log(today)
        // const loans = await Loan.find( { active: true, expectedEndDate: {$gt: today} } );
        const loans = await Loan.updateMany(
            { active: true, expectedEndDate: {$gte: today} },
            {status: 'completed', active: false}
        );

        console.log(loans)
        return loans
    
        // if(loans.length > 0) {
        //     loans.forEach(async (loan) => {
        //         loan.status = 'completed';
        //         loan.active = false;
    
        //         await loan.save();
        //     });
        // }
    }
};

module.exports = manager;
