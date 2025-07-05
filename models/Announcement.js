const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    type: {
        type: String,
        enum: ['general', 'important', 'urgent', 'maintenance'],
        default: 'general'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    targetAudience: {
        type: String,
        enum: ['all', 'students', 'admin'],
        default: 'all'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
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
announcementSchema.index({ isActive: 1, createdAt: -1 });
announcementSchema.index({ targetAudience: 1, isActive: 1 });
announcementSchema.index({ expiresAt: 1, isActive: 1 });

// Method to check if announcement is expired
announcementSchema.methods.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
};

// Method to check if announcement should be visible
announcementSchema.methods.isVisible = function() {
    return this.isActive && !this.isExpired();
};

// Static method to get active announcements
announcementSchema.statics.getActiveAnnouncements = function(audience = 'all') {
    return this.find({
        isActive: true,
        $or: [
            { targetAudience: 'all' },
            { targetAudience: audience }
        ],
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    }).sort({ createdAt: -1 }).populate('createdBy', 'name');
};

module.exports = mongoose.model('Announcement', announcementSchema); 