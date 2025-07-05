const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'user_registered',
            'user_login',
            'user_logout',
            'material_uploaded',
            'material_updated',
            'material_deleted',
            'subscription_created',
            'subscription_renewed',
            'subscription_cancelled',
            'announcement_created',
            'announcement_updated',
            'announcement_deleted',
            'user_status_changed',
            'user_deleted',
            'admin_login',
            'profile_updated',
            'password_changed',
            'college_notices_refreshed'
        ]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Some actions might not have a specific user
    },
    userEmail: {
        type: String,
        required: false
    },
    userName: {
        type: String,
        required: false
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        required: false
    },
    userAgent: {
        type: String,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
logSchema.index({ timestamp: -1 });
logSchema.index({ action: 1 });
logSchema.index({ userId: 1 });

// Static method to create logs
logSchema.statics.createLog = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Error creating log:', error);
        throw error;
    }
};

// Static method to get recent logs
logSchema.statics.getRecentLogs = async function(limit = 50) {
    try {
        return await this.find({})
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('userId', 'name email role')
            .lean();
    } catch (error) {
        console.error('Error fetching recent logs:', error);
        throw error;
    }
};

// Static method to get logs by action
logSchema.statics.getLogsByAction = async function(action, limit = 20) {
    try {
        return await this.find({ action })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('userId', 'name email role')
            .lean();
    } catch (error) {
        console.error('Error fetching logs by action:', error);
        throw error;
    }
};

module.exports = mongoose.model('Log', logSchema); 