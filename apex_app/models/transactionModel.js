const mongoose = require('mongoose');


const transactionSchema = new mongoose.Schema({
    lenderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    type: {
        type: String,
        enum: [
            'Debit',
            'Credit'
        ],
    },

    description: {
        type: String,
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    balance: {
        type: Number,
        required: true
    }

}, {
    timestamps: true
})

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;