const mongoose = require('mongoose');

// Auction Schema
const auctionSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: [true, 'Item name is required'],
    },
    description: {
        type: String,
        default: '',
    },
    startingBid: {
        type: Number,
        required: [true, 'Starting bid is required'],
        min: [0, 'Starting bid must be positive'],
    },
    currentBid: {
        type: Number,
        default: 0,
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required'],
    },
    seller: {
        type: String,
        required: [true, 'Seller information is required'],
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'closed'],
    },
}, { timestamps: true });

module.exports = mongoose.model('Auction', auctionSchema);
