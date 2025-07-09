const mongoose = require('mongoose');

const materialDownloadLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material',
        required: true
    },
    downloadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MaterialDownloadLog', materialDownloadLogSchema); 