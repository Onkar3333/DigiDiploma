const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    branch: {
        type: String,
        required: true
    },
    plan: {
        type: String,
        enum: ['basic', 'premium', 'complete'],
        default: 'basic'
    },
    amount: {
        type: Number,
        required: true
    },
    paymentId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'expired', 'cancelled'],
        default: 'pending'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    features: [{
        type: String,
        enum: ['pdf_access', 'video_access', 'quiz_access', 'download_access', 'priority_support']
    }],
    autoRenew: {
        type: Boolean,
        default: false
    },
    lastReminderSent: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
subscriptionSchema.index({ paymentId: 1 });

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && new Date() <= this.endDate;
};

// Method to check if subscription is expiring soon (within 7 days)
subscriptionSchema.methods.isExpiringSoon = function() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return this.status === 'active' && this.endDate <= sevenDaysFromNow;
};

// Method to extend subscription
subscriptionSchema.methods.extend = function(days) {
    this.endDate = new Date(this.endDate.getTime() + (days * 24 * 60 * 60 * 1000));
    return this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema); 