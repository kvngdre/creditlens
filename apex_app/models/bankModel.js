const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },

code: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 6,
        trim: true
    }
});

const Bank = mongoose.model('Bank', bankSchema);

module.exports = Bank;