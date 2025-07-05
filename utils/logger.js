const Log = require('../models/Log');

// Helper function to get client IP address
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// Helper function to get user agent
const getUserAgent = (req) => {
    return req.headers['user-agent'] || '';
};

// Main logging function
const createActivityLog = async (action, req, details = {}) => {
    try {
        const logData = {
            action,
            details,
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req)
        };

        // Add user information if available
        if (req.user) {
            logData.userId = req.user.userId;
            logData.userEmail = req.user.email;
            logData.userName = req.user.name;
        }

        await Log.createLog(logData);
    } catch (error) {
        console.error('Error creating activity log:', error);
        // Don't throw error to avoid breaking the main functionality
    }
};

// Specific logging functions for common actions
const logUserRegistration = async (req, userData) => {
    await createActivityLog('user_registered', req, {
        email: userData.email,
        role: userData.role,
        college: userData.college,
        branch: userData.branch
    });
};

const logUserLogin = async (req, userData) => {
    await createActivityLog('user_login', req, {
        email: userData.email,
        role: userData.role
    });
};

const logUserLogout = async (req) => {
    await createActivityLog('user_logout', req);
};

const logMaterialUpload = async (req, materialData) => {
    await createActivityLog('material_uploaded', req, {
        title: materialData.title,
        category: materialData.category,
        branch: materialData.branch,
        semester: materialData.semester
    });
};

const logMaterialUpdate = async (req, materialData) => {
    await createActivityLog('material_updated', req, {
        materialId: materialData._id,
        title: materialData.title,
        changes: materialData.changes
    });
};

const logMaterialDelete = async (req, materialData) => {
    await createActivityLog('material_deleted', req, {
        materialId: materialData._id,
        title: materialData.title
    });
};

const logAnnouncementCreate = async (req, announcementData) => {
    await createActivityLog('announcement_created', req, {
        title: announcementData.title,
        type: announcementData.type,
        priority: announcementData.priority
    });
};

const logAnnouncementUpdate = async (req, announcementData) => {
    await createActivityLog('announcement_updated', req, {
        announcementId: announcementData._id,
        title: announcementData.title,
        changes: announcementData.changes
    });
};

const logAnnouncementDelete = async (req, announcementData) => {
    await createActivityLog('announcement_deleted', req, {
        announcementId: announcementData._id,
        title: announcementData.title
    });
};

const logUserStatusChange = async (req, userData, newStatus) => {
    await createActivityLog('user_status_changed', req, {
        userId: userData._id,
        email: userData.email,
        previousStatus: userData.isActive,
        newStatus: newStatus
    });
};

const logUserDelete = async (req, userData) => {
    await createActivityLog('user_deleted', req, {
        userId: userData._id,
        email: userData.email,
        role: userData.role
    });
};

const logProfileUpdate = async (req, changes) => {
    await createActivityLog('profile_updated', req, {
        updatedFields: Object.keys(changes)
    });
};

const logCollegeNoticesRefresh = async (req, result) => {
    await createActivityLog('college_notices_refreshed', req, {
        noticesCount: result.count,
        source: result.source
    });
};

module.exports = {
    createActivityLog,
    logUserRegistration,
    logUserLogin,
    logUserLogout,
    logMaterialUpload,
    logMaterialUpdate,
    logMaterialDelete,
    logAnnouncementCreate,
    logAnnouncementUpdate,
    logAnnouncementDelete,
    logUserStatusChange,
    logUserDelete,
    logProfileUpdate,
    logCollegeNoticesRefresh
}; 