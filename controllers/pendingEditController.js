const { roles } = require('../utils/constants');
const Customer = require('../models/customerModel');
const debug = require('debug')('app:pendingEditCtrl');
const flattenObject = require('../utils/flattenObj');
const Loan = require('../models/loanModel');
const logger = require('../utils/logger')('pendingEditCtrl.js');
const mongoose = require('mongoose');
const PendingEdit = require('../models/pendingEditModel');
const ServerError = require('../errors/serverError');

module.exports = {
    create: async (user, payload) => {
        try {
            const newPendingEdit = new PendingEdit({
                lender: user.lender,
                docId: payload.docId,
                type: payload.type,
                createdBy: user.id,
                modifiedBy: user.id,
                alteration: payload.alteration,
            });

            await newPendingEdit.save();

            return {
                message: 'Edit request submitted.',
                data: newPendingEdit,
            };
        } catch (exception) {
            logger.error({
                method: 'create',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            if (exception.name === 'ValidationError') {
                const field = Object.keys(exception.errors)[0];
                const errorMsg = exception.errors[field].message.replace(
                    'Path',
                    ''
                );
                return new ServerError(400, errorMsg);
            }
            return new ServerError(500, 'Something went wrong');
        }
    },

    getAll: async (user) => {
        try {
            const customerEdits = await PendingEdit.aggregate([
                {
                    $match: {
                        lender: user.lender,
                        createdBy: ![roles.agent, roles.credit].includes(
                            user.role
                        )
                            ? { $ne: null }
                            : mongoose.Types.ObjectId(user.id),
                        type: 'Customer',
                    },
                },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'docId',
                        foreignField: '_id',
                        as: 'customer',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'createdBy',
                        foreignField: '_id',
                        as: 'createdBy',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'modifiedBy',
                        foreignField: '_id',
                        as: 'modifiedBy',
                    },
                },
                {
                    $project: {
                        _id: 1,
                        lender: 1,
                        docId: 1,
                        createdBy: 1,
                        modifiedBy: 1,
                        type: 1,
                        status: 1,
                        remark: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        alteration: 1,
                        state: {
                            $function: {
                                body: function (alteration, self) {
                                    try {
                                        const fieldsToProject = {};

                                        Object.keys(alteration).forEach(
                                            (key) =>
                                                (fieldsToProject[key] =
                                                    self[0][key])
                                        );
                                        return fieldsToProject;
                                    } catch (err) {
                                        return { error: 'Document not found.' };
                                    }
                                },
                                args: ['$alteration', '$customer'],
                                lang: 'js',
                            },
                        },
                        createdBy: {
                            _id: 1,
                            name: 1,
                            displayName: 1,
                            fullName: 1,
                            jobTitle: 1,
                            role: 1,
                        },
                        modifiedBy: {
                            _id: 1,
                            name: 1,
                            displayName: 1,
                            fullName: 1,
                            jobTitle: 1,
                            role: 1,
                        },
                    },
                },
            ]).exec();

            // Aggregation pipeline for fetching pending loan edits.
            const loanEdits = await PendingEdit.aggregate([
                {
                    $match: {
                        lender: user.lender,
                        createdBy: ![roles.agent, roles.operations].includes(
                            user.role
                        )
                            ? { $ne: null }
                            : mongoose.Types.ObjectId(user.id),
                        type: 'Loan',
                    },
                },
                {
                    $lookup: {
                        from: 'loans',
                        localField: 'docId',
                        foreignField: '_id',
                        as: 'loan',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'createdBy',
                        foreignField: '_id',
                        as: 'createdBy',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'modifiedBy',
                        foreignField: '_id',
                        as: 'modifiedBy',
                    },
                },
                {
                    $project: {
                        _id: 1,
                        lender: 1,
                        docId: 1,
                        type: 1,
                        status: 1,
                        remark: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        alteration: 1,
                        state: {
                            $function: {
                                body: function (alteration, self) {
                                    try {
                                        const fieldsToProject = {};

                                        Object.keys(alteration).forEach(
                                            (key) =>
                                                (fieldsToProject[key] =
                                                    self[0][key])
                                        );

                                        return fieldsToProject;
                                    } catch (err) {
                                        return { error: 'Document not found.' };
                                    }
                                },
                                args: ['$alteration', '$loan'],
                                lang: 'js',
                            },
                        },
                        createdBy: {
                            _id: 1,
                            name: 1,
                            displayName: 1,
                            fullName: 1,
                            jobTitle: 1,
                            role: 1,
                        },
                        modifiedBy: {
                            _id: 1,
                            name: 1,
                            displayName: 1,
                            fullName: 1,
                            jobTitle: 1,
                            role: 1,
                        },
                    },
                },
            ]).exec();

            const pendingEdits = [...customerEdits, ...loanEdits];
            if (pendingEdits.length === 0)
                return new ServerError(404, 'No pending edits');

            // sort in descending order by createdAt field
            pendingEdits.sort((a, b) => {
                if (a.createdAt > b.createdAt) return -1;
                if (a.createdAt < b.createdAt) return 1;
                return 0;
            });

            return {
                message: 'Success',
                data: pendingEdits,
            };
        } catch (exception) {
            logger.error({
                method: 'get_all',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            return new ServerError(500, 'Something went wrong');
        }
    },

    getOne: async (id, user) => {
        try {
            const customerEdit = await PendingEdit.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(id),
                        lender: user.lender,
                        createdBy: ![roles.agent, roles.credit].includes(
                            user.role
                        )
                            ? { $ne: null }
                            : mongoose.Types.ObjectId(user.id),
                        type: 'Customer',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'createdBy',
                        foreignField: '_id',
                        as: 'createdBy',
                    },
                },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'docId',
                        foreignField: '_id',
                        as: 'customer',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'modifiedBy',
                        foreignField: '_id',
                        as: 'modifiedBy',
                    },
                },
                {
                    $project: {
                        _id: 1,
                        lender: 1,
                        docId: 1,
                        type: 1,
                        status: 1,
                        remark: 1,
                        alteration: 1,
                        state: {
                            $function: {
                                body: function (alteration, self) {
                                    try {
                                        const fieldsToProject = {};

                                        Object.keys(alteration).forEach(
                                            (key) =>
                                                (fieldsToProject[key] =
                                                    self[0][key])
                                        );

                                        return fieldsToProject;
                                    } catch (err) {
                                        return { error: 'Document not found.' };
                                    }
                                },
                                args: ['$alteration', '$customer'],
                                lang: 'js',
                            },
                        },
                        createdBy: {
                            _id: 1,
                            name: 1,
                            displayName: 1,
                            fullName: 1,
                            jobTitle: 1,
                            role: 1,
                        },
                        modifiedBy: {
                            _id: 1,
                            name: 1,
                            displayName: 1,
                            fullName: 1,
                            jobTitle: 1,
                            role: 1,
                        },
                    },
                },
            ]).exec();

            if (customerEdit.length === 0) {
                const loanEdit = await PendingEdit.aggregate([
                    {
                        $match: {
                            lender: user.lender,
                            createdBy: ![
                                roles.agent,
                                roles.operations,
                            ].includes(user.role)
                                ? { $ne: null }
                                : mongoose.Types.ObjectId(user.id),
                            type: 'Loan',
                        },
                    },
                    {
                        $lookup: {
                            from: 'loans',
                            localField: 'docId',
                            foreignField: '_id',
                            as: 'loan',
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'userId',
                            foreignField: '_id',
                            as: 'user',
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            lender: 1,
                            docId: 1,
                            type: 1,
                            status: 1,
                            remark: 1,
                            alteration: 1,
                            state: {
                                $function: {
                                    body: function (alteration, self) {
                                        try {
                                            const fieldsToProject = {};

                                            Object.keys(alteration).forEach(
                                                (key) =>
                                                    (fieldsToProject[key] =
                                                        self[0][key])
                                            );

                                            return fieldsToProject;
                                        } catch (err) {
                                            return {
                                                error: 'Document not found.',
                                            };
                                        }
                                    },
                                    args: ['$alteration', '$loan'],
                                    lang: 'js',
                                },
                            },
                            createdBy: {
                                _id: 1,
                                name: 1,
                                displayName: 1,
                                fullName: 1,
                                jobTitle: 1,
                                role: 1,
                            },
                            modifiedBy: {
                                _id: 1,
                                name: 1,
                                displayName: 1,
                                fullName: 1,
                                jobTitle: 1,
                                role: 1,
                            },
                        },
                    },
                ]).exec();

                return {
                    message: 'success',
                    data: loanEdit,
                };
            }

            return {
                message: 'success',
                data: customerEdit,
            };
        } catch (exception) {
            logger.error({
                method: 'get_one',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            return new ServerError(500, 'Something went wrong');
        }
    },

    update: async (id, user, payload) => {
        try {
            const queryParams = { _id: id, createdBy: user.id };

            const foundEditRequest = await PendingEdit.findOne(queryParams);
            if (!foundEditRequest)
                return new ServerError(404, 'Edit request document not found');
            if (foundEditRequest.status !== 'Pending')
                return new ServerError(403, 'Cannot perform update operation');

            payload = flattenObject(payload);

            if (![roles.credit, roles.operations].includes(user.role)) {
                // user role is neither credit nor operations, update alteration only
                foundEditRequest.set(payload);
                foundEditRequest.modifiedBy = user.id;

                await foundEditRequest.save();
                return {
                    message: 'Edit request has been updated',
                    data: foundEditRequest,
                };
            }

            if (payload.status === 'Approved') {
                if (foundEditRequest.type === 'Customer') {
                    const foundCustomer = await Customer.findById(
                        foundEditRequest.docId
                    );
                    if (!foundCustomer)
                        return new ServerError(
                            404,
                            'Operation failed. Customer document not found.'
                        );

                    foundCustomer.set(foundEditRequest.alteration);

                    // run customer document validation
                    const error = foundCustomer.validateSync();
                    if (error) {
                        const msg =
                            error.errors[Object.keys(error.errors)[0]].message;
                        return new ServerError(400, msg);
                    }
                    await foundCustomer.save();
                } else {
                    // edit request type is 'Loan'
                    const foundLoan = await Loan.findById(
                        foundEditRequest.docId
                    );
                    if (!foundLoan)
                        return new ServerError(
                            404,
                            'Operation failed. Loan document not found.'
                        );

                    foundLoan.set(foundEditRequest.alteration);

                    // run loan document validation
                    const error = foundLoan.validateSync();
                    if (error) {
                        const msg =
                            error.errors[Object.keys(error.errors)[0]].message;
                        return new ServerError(400, msg);
                    }
                    await foundLoan.save();
                }
            }
            foundEditRequest.set(payload);
            return {
                message: 'Edit request has been updated',
                data: foundEditRequest,
            };
        } catch (exception) {
            logger.error({
                method: 'update',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            if (exception.name === 'ValidationError') {
                const field = Object.keys(exception.errors)[0];
                const errorMsg = exception.errors[field].message.replace(
                    'Path',
                    ''
                );
                return new ServerError(400, errorMsg);
            }
            return new ServerError(500, 'Something went wrong');
        }
    },

    delete: async (id, user) => {
        try {
            //
            const queryParams = ![
                roles.admin,
                roles.master,
                roles.owner,
            ].includes(user.role)
                ? { _id: id, createdBy: user.id }
                : { _id: id };

            const foundPendingEdit = await PendingEdit.findOne(queryParams);
            if (!foundPendingEdit)
                return new ServerError(404, 'Edit request not found');
            if (foundPendingEdit.status !== 'Pending')
                return new ServerError(403, 'Cannot perform delete operation');

            await foundPendingEdit.delete();

            return {
                message: 'Edit request has been deleted',
                data: foundPendingEdit,
            };
        } catch (exception) {
            logger.error({
                method: 'delete',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            return new ServerError(500, 'Something went wrong');
        }
    },
};
