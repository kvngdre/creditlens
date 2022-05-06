const mongoose = require('mongoose');

const pendingSchema = new mongoose.Schema({
    lenderId: {
        type: String,
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    type: {
        type: String,
        enum: [
            'customer',
            'loan'
        ],
        required: true
    },

    status: {
        type: String,
        enum: [
            'approved',
            'declined',
            'pending',
        ],
        default: 'pending'
    },

}, {
    strict: false,
    timestamps: true
});

const Pending = mongoose.model('PendingEdit', pendingSchema);

module.exports = Pending;
