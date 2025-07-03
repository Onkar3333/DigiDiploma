const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['pdf', 'video', 'document', 'image', 'link'],
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        default: 0
    },
    thumbnail: {
        type: String,
        default: ''
    },
    subject: {
        type: String,
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
    category: {
        type: String,
        enum: ['syllabus', 'manual_answer', 'guessing_papers', 'model_answers', 'msbte_imp', 'micro_project', 'notes'],
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        trim: true
    }],
    duration: {
        type: Number, // for videos in seconds
        default: 0
    },
    pages: {
        type: Number, // for PDFs
        default: 0
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
materialSchema.index({ subject: 1, semester: 1, branch: 1, category: 1 });
materialSchema.index({ uploadedBy: 1 });
materialSchema.index({ isActive: 1 });

// Method to increment view count
materialSchema.methods.incrementView = function() {
    this.viewCount += 1;
    return this.save();
};

// Method to increment download count
materialSchema.methods.incrementDownload = function() {
    this.downloadCount += 1;
    return this.save();
};

module.exports = mongoose.model('Material', materialSchema); 