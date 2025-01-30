const mongoose = require('mongoose');

// Bid Schema
const bidSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: [true, 'Item ID is required'],
    },
    bidder: {
        type: String,
        required: [true, 'Bidder information is required'],
    },
    bidAmount: {
        type: Number,
        required: [true, 'Bid amount is required'],
        min: [1, 'Bid amount must be at least 1'],
    },
    bidderAvatar: {
        type: String,
        default: 'https://randomuser.me/api/portraits/lego/1.jpg'
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for time ago
bidSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const bidTime = this.createdAt;
    const diffMs = now - bidTime;
    const diffMins = Math.round(diffMs / 60000);
    const diffHrs = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return `${diffDays} days ago`;
});

module.exports = mongoose.model('Bid', bidSchema);
