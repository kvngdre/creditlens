const jwt = require('jsonwebtoken');
const User = require('./userModel');
const mongoose = require('mongoose');

const lenderSchema = new mongoose.Schema({
    // TODO: turn on required
    companyName: {
        type: String,
        required: true,
        trim: true,
    },

    slug: {
        type: String,
        unique: true,
        // required: true
    },

    companyAddress: {
        type: String,
        required: true,
        minLength: 10,
        maxLength: 255,
        trim: true
    },

    cacNumber: {
        type: String,
        required: true
    },

    category: {
        type: String,
        enum: [
            'MFB', 
            'Finance House', 
            'Money Lender'
        ],
        required: true,
    },

    phone: {
        type: String,
        length: 11,
        trim: true
    },

    email: {
        type: String,
        unique: true,
        trim: true,
        required: true
    },

    password: {
        type: String,
        minLength: 6,
        maxLength: 1024,
        required: true
    },

    otp: {
        OTP: {
            type: String,
        },
        
        expirationTime: {
            type: Number,
        }
    },

    active: {
        type: Boolean
    },

    role: {
        type: String,
        default: 'Lender'
    },

    balance: {
        type: Number,
        default: 0
    },

    lastReferenceCode: {
        type: String
    },

    // TODO: Work on auto generating url
    lenderURL: {
        type: String,
        lowercase: true,
        trim: true
    },
    // TODO: Should there be more than one admin?
    adminUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    lastLoginTime: {
        type: Date,
        default: null
    }

}, {
    timestamps: true,
}); 

lenderSchema.methods.generateToken = function() {
    return jwt.sign({
        lenderId: this._id, 
        companyName: this.companyName, 
        email: this.email,
        phone: this.phone,
        role: this.role,
        balance: this.balance,
        adminUser: !!this.adminUser,
        lastLoginTime: this.lastLoginTime
    }, 
    process.env.JWT_PRIVATE_KEY);
}

const Lender = mongoose.model('Lender', lenderSchema);

module.exports = Lender;