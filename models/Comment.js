const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: [true, 'Item ID is required']
    },
    userId: {
        type: String,
        required: [true, 'User ID is required']
    },
    username: {
        type: String,
        required: [true, 'Username is required']
    },
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        trim: true,
        maxLength: [500, 'Comment cannot be longer than 500 characters']
    },
    userAvatar: {
        type: String,
        default: 'https://randomuser.me/api/portraits/lego/1.jpg'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for time ago
commentSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const commentTime = this.createdAt;
    const diffMs = now - commentTime;
    const diffMins = Math.round(diffMs / 60000);
    const diffHrs = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return `${diffDays} days ago`;
});

module.exports = mongoose.model('Comment', commentSchema);
