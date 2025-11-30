import Joi from 'joi';

// User validation schemas
export const userRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 50 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  college: Joi.string().min(2).max(100).required().messages({
    'string.min': 'College name must be at least 2 characters long',
    'string.max': 'College name must not exceed 100 characters',
    'any.required': 'College name is required'
  }),
  studentId: Joi.string().min(3).max(20).required().messages({
    'string.min': 'Student ID must be at least 3 characters long',
    'string.max': 'Student ID must not exceed 20 characters',
    'any.required': 'Student ID is required'
  }),
  branch: Joi.string().valid(
    'Computer Engineering',
    'Electronics & Telecommunication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Information Technology',
    'Electrical Engineering',
    'Automobile Engineering',
    'Instrumentation Engineering',
    'Artificial Intelligence & Machine Learning (AIML)',
    'Mechatronics Engineering'
  ).required().messages({
    'any.only': 'Please select a valid branch',
    'any.required': 'Branch is required'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  semester: Joi.string().valid('1', '2', '3', '4', '5', '6').optional(),
  userType: Joi.string().valid('student', 'admin').default('student')
});

export const userLoginSchema = Joi.object({
  emailOrStudentId: Joi.string().required().messages({
    'any.required': 'Email or Student ID is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

export const adminChangePasswordSchema = Joi.object({
  userId: Joi.string().optional(), // If provided, admin is changing another user's password
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

// Notice validation schemas
export const noticeCreateSchema = Joi.object({
  title: Joi.string().min(5).max(200).required().messages({
    'string.min': 'Title must be at least 5 characters long',
    'string.max': 'Title must not exceed 200 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().min(10).max(5000).required().messages({
    'string.min': 'Content must be at least 10 characters long',
    'string.max': 'Content must not exceed 5000 characters',
    'any.required': 'Content is required'
  }),
  type: Joi.string().valid('general', 'important', 'urgent', 'announcement', 'maintenance').default('general'),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  targetAudience: Joi.string().valid('all', 'students', 'admins', 'specific_branch').default('all'),
  targetBranch: Joi.string().when('targetAudience', {
    is: 'specific_branch',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  isPinned: Joi.boolean().default(false),
  expiresAt: Joi.date().greater('now').optional(),
  attachments: Joi.array().items(Joi.string()).default([]),
  tags: Joi.array().items(Joi.string()).default([])
});

// Material validation schemas
export const materialCreateSchema = Joi.object({
  title: Joi.string().min(3).max(200).required().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title must not exceed 200 characters',
    'any.required': 'Title is required'
  }),
  resourceType: Joi.string().valid(
    'syllabus',
    'manual_answer',
    'guess_papers',
    'model_answer_papers',
    'msbte_imp',
    'pyqs',
    'micro_project_topics',
    'notes'
  ).required().messages({
    'any.only': 'Resource type must be one of: syllabus, manual_answer, guess_papers, model_answer_papers, msbte_imp (DigiDiploma VVIMP), pyqs, micro_project_topics, notes',
    'any.required': 'Resource type is required'
  }),
  type: Joi.string().valid('pdf', 'video', 'notes', 'link').required().messages({
    'any.only': 'Type must be one of: pdf, video, notes, link',
    'any.required': 'Type is required'
  }),
  url: Joi.string().when('type', {
    is: 'link',
    then: Joi.string().uri().required().messages({
      'string.uri': 'Please provide a valid URL',
      'any.required': 'URL is required for external links'
    }),
    otherwise: Joi.string().optional().allow('')
  }),
  description: Joi.string().max(1000).optional().allow(''),
  subjectId: Joi.string().required().messages({
    'any.required': 'Subject ID is required'
  }),
  subjectName: Joi.string().optional().allow(''),
  branch: Joi.string().required().messages({
    'any.required': 'Branch is required'
  }),
  semester: Joi.string().required().messages({
    'any.required': 'Semester is required'
  }),
  subjectCode: Joi.string().required().messages({
    'any.required': 'Subject code is required'
  }),
  tags: Joi.array().items(Joi.string()).default([]),
  uploadedBy: Joi.string().optional(),
  // Access type: 'free', 'drive_protected', 'paid'
  accessType: Joi.string().valid('free', 'drive_protected', 'paid').default('free').messages({
    'any.only': 'Access type must be one of: free, drive_protected, paid'
  }),
  // Price for paid materials (in INR)
  price: Joi.number().min(0).default(0).messages({
    'number.min': 'Price must be 0 or greater'
  }),
  // Google Drive URL for drive protected materials
  googleDriveUrl: Joi.string().uri().allow('', null).optional().messages({
    'string.uri': 'Please provide a valid Google Drive URL'
  }),
  // Branches array (for multi-branch support)
  branches: Joi.array().items(Joi.string()).optional(),
  // Cover photo URL
  coverPhoto: Joi.string().uri().allow('', null).optional(),
  // Storage type: 'r2' or 'local'
  storageType: Joi.string().valid('r2', 'local').optional()
});

const sanitizePhone = (value, helpers) => {
  if (!value) return value;
  const cleaned = value.replace(/[\s()-]/g, '');
  if (!cleaned) return '';
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return helpers.error('string.pattern.base', { value });
  }
  return cleaned;
};

export const internshipApplicationSchema = Joi.object({
  name: Joi.string().min(3).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required().messages({
    'string.pattern.base': 'Please enter a valid phone number'
  }),
  collegeName: Joi.string().min(2).max(150).required(),
  branch: Joi.string().min(2).max(120).required(),
  semester: Joi.string().valid('1', '2', '3', '4', '5', '6').required(),
  type: Joi.string().valid('Hardware', 'Software').required(),
  mode: Joi.string().valid('Hybrid', 'Onsite', 'Online').required(),
  duration: Joi.string().min(1).max(60).required(),
  preferredLocation: Joi.string().allow('').optional(),
  internshipType: Joi.string().valid('Free', 'Stipend').required(),
  additionalNotes: Joi.string().allow('').max(1500).optional(),
  resumeBase64: Joi.string().allow('').optional(),
  resumeFileName: Joi.string().allow('').optional(),
  resumeContentType: Joi.string().allow('').default('application/pdf'),
  resumeUrl: Joi.string().uri().allow('').optional(),
  source: Joi.string().allow('').optional(),
  userId: Joi.string().allow(null, '').optional()
});

export const contactMessageSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null).custom(sanitizePhone, 'Phone sanitizer').messages({
    'string.pattern.base': 'Please provide a valid phone number with country code'
  }),
  subject: Joi.string().min(3).max(200).required(),
  message: Joi.string().min(10).max(4000).required()
});

export const projectRequestSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null).custom(sanitizePhone, 'Phone sanitizer').messages({
    'string.pattern.base': 'Please provide a valid phone number with country code'
  }),
  branch: Joi.string().allow('', null),
  semester: Joi.string().allow('', null),
  projectIdea: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(6000).required(),
  requiredTools: Joi.string().allow('', null),
  deadline: Joi.string().allow('', null),
  notes: Joi.string().allow('', null)
});

export const adminReplySchema = Joi.object({
  replySubject: Joi.string().min(3).max(200).required(),
  headerText: Joi.string().min(3).max(200).required(),
  messageText: Joi.string().min(10).max(6000).required(),
  footerText: Joi.string().min(3).max(500).required()
});

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: errorMessages
      });
    }
    
    req.body = value;
    next();
  };
};

// Query parameter validation
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        error: 'Query validation failed',
        details: errorMessages
      });
    }
    
    req.query = value;
    next();
  };
};
