const Bank = require('../models/bankModel');
const bankValidators = require('../validators/bank.validator');
const debug = require('debug')('app:bankModel');
const logger = require('../utils/logger')('bankCtrl.js');
const ServerResponse = require('../utils/ServerResponse');

const MONGO_DUPLICATE_ERROR_CODE = 11000;

class BankController {
    /**
     *
     * @param {Object} bankDto
     * @param {string} bankDto.name - The name of the bank.
     * @param {string} bankDto.code - The bank code.
     * @returns
     */
    async create({ name, code }) {
        try {
            const { error } = bankValidators.validateCreation({ name, code });
            if (error)
                return new ServerResponse(
                    400,
                    this.#formatMsg(error.details[0].message)
                );

            const newBank = new Bank({
                name,
                code,
            });
            await newBank.save();

            return new ServerResponse(201, 'Bank created', newBank);
        } catch (exception) {
            logger.error({
                method: 'createBank',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            if (exception.code === MONGO_DUPLICATE_ERROR_CODE) {
                let field = Object.keys(exception.keyPattern)[0];
                return new ServerResponse(409, `Bank ${field} already in use.`);
            }
            return new ServerResponse(500, 'Something went wrong');
        }
    }

    /**
     * Retrieves all banks
     * @returns
     */
    async getBanks() {
        try {
            const foundBanks = await Bank.find();
            if (foundBanks.length === 0)
                return new ServerResponse(404, 'No banks found');

            return new ServerResponse(200, 'Success', foundBanks);
        } catch (exception) {
            logger.error({
                method: 'getBanks',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            return new ServerResponse(500, 'Something went wrong');
        }
    }

    /**
     * Retrieves a bank.
     * @param {string} id - The bank object id.
     * @returns
     */
    async getBank(id) {
        try {
            const foundBank = await Bank.findById(id);
            if (!foundBank) return new ServerResponse(404, 'Bank not found');

            return new ServerResponse(200, 'Success', foundBank);
        } catch (exception) {
            logger.error({
                method: 'getBank',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            return new ServerResponse(500, 'Something went wrong');
        }
    }

    /**
     * Modifies a bank
     * @param {string} id
     * @param {Object} alteration
     * @returns
     */
    async updateBank(id, alteration) {
        try {
            const { error } = bankValidators.validateUpdate(alteration);
            if (error)
                return new ServerResponse(
                    400,
                    this.#formatMsg(error.details[0].message)
                );

            const foundBank = await Bank.findById(id);
            if (!foundBank) return new ServerResponse(404, 'Bank not found');

            foundBank.set(alteration);
            await foundBank.save();

            return new ServerResponse(200, 'Success', foundBank);
        } catch (exception) {
            logger.error({
                method: 'updateBank',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            if (exception.code === MONGO_DUPLICATE_ERROR_CODE) {
                let field = Object.keys(exception.keyPattern)[0];
                return new ServerResponse(409, `Bank ${field} already in use.`);
            }
            return new ServerResponse(500, 'Something went wrong');
        }
    }

    /**
     * Deletes a bank
     * @param {string} id
     * @returns
     */
    async deleteBank(id) {
        try {
            const foundBank = await Bank.findById(id);
            if (!foundBank) return new ServerResponse(404, 'Bank not found');

            await foundBank.delete();

            return new ServerResponse(200, 'Bank deleted');
        } catch (exception) {
            logger.error({
                method: 'deleteBank',
                message: exception.message,
                meta: exception.stack,
            });
            debug(exception);
            return new ServerResponse(500, 'Something went wrong');
        }
    }

    #formatMsg(errorMsg) {
        const regex = /\B(?=(\d{3})+(?!\d))/g;
        let msg = `${errorMsg.replaceAll('"', '')}.`; // remove quotation marks.
        msg = msg.replace(regex, ','); // add comma to numbers if present in error msg.
        return msg;
    }
}

module.exports = new BankController();
