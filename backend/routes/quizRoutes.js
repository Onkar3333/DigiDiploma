import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import FirebaseQuiz from '../models/FirebaseQuiz.js';
import FirebaseQuizAttempt from '../models/FirebaseQuizAttempt.js';
import FirebaseSubscription from '../models/FirebaseSubscription.js';
import FirebaseUser from '../models/FirebaseUser.js';

const router = express.Router();

// Get quizzes for a subject
router.get('/subject/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    // Check if user has access to quizzes
    const user = await FirebaseUser.findById(req.user.userId);
    const hasAccess = await FirebaseSubscription.hasAccess(req.user.userId, 'quizzes', user.semester);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription required to access quizzes' });
    }
    
    const quizzes = await FirebaseQuiz.findBySubject(subjectId);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get quizzes for semester and branch
router.get('/semester/:semester/branch/:branch', authenticateToken, async (req, res) => {
  try {
    const { semester, branch } = req.params;
    
    // Check if user has access to quizzes
    const user = await FirebaseUser.findById(req.user.userId);
    const hasAccess = await FirebaseSubscription.hasAccess(req.user.userId, 'quizzes', user.semester);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription required to access quizzes' });
    }
    
    const quizzes = await FirebaseQuiz.findBySemesterBranch(parseInt(semester), branch);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get quiz by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has access to quizzes
    const user = await FirebaseUser.findById(req.user.userId);
    const hasAccess = await FirebaseSubscription.hasAccess(req.user.userId, 'quizzes', user.semester);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription required to access quizzes' });
    }
    
    const quiz = await FirebaseQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Start quiz attempt
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has access to quizzes
    const user = await FirebaseUser.findById(req.user.userId);
    const hasAccess = await FirebaseSubscription.hasAccess(req.user.userId, 'quizzes', user.semester);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription required to access quizzes' });
    }
    
    const quiz = await FirebaseQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    if (!quiz.isActive) {
      return res.status(400).json({ error: 'Quiz is not active' });
    }
    
    // Check if user can attempt quiz
    const canAttempt = await FirebaseQuizAttempt.canAttempt(
      req.user.userId, 
      id, 
      quiz.maxAttempts
    );
    
    if (!canAttempt) {
      return res.status(400).json({ error: 'Maximum attempts reached' });
    }
    
    // Get user's attempt number
    const userAttempts = await FirebaseQuizAttempt.findByUser(req.user.userId, id);
    const attemptNumber = userAttempts.length + 1;
    
    // Create quiz attempt
    const attemptData = {
      userId: req.user.userId,
      quizId: id,
      quizTitle: quiz.title,
      subjectId: quiz.subjectId,
      subjectName: quiz.subjectName,
      branch: quiz.branch,
      semester: quiz.semester,
      totalQuestions: quiz.questions.length,
      timeLimit: quiz.timeLimit,
      attemptNumber,
      status: 'started'
    };
    
    const attempt = await FirebaseQuizAttempt.create(attemptData);
    
    res.json({
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questions: quiz.questions,
        timeLimit: quiz.timeLimit,
        maxAttempts: quiz.maxAttempts,
        passingScore: quiz.passingScore
      }
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

// Submit quiz attempt
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { attemptId, answers, timeSpent } = req.body;
    
    const attempt = await FirebaseQuizAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ error: 'Quiz attempt not found' });
    }
    
    if (attempt.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const quiz = await FirebaseQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Calculate score
    let correctAnswers = 0;
    let wrongAnswers = 0;
    
    const processedAnswers = answers.map(answer => {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      const isCorrect = question && question.correctAnswer === answer.selectedAnswer;
      
      if (isCorrect) correctAnswers++;
      else wrongAnswers++;
      
      return {
        ...answer,
        isCorrect
      };
    });
    
    const score = correctAnswers;
    const percentage = (score / quiz.questions.length) * 100;
    const passed = percentage >= quiz.passingScore;
    
    // Update attempt
    attempt.answers = processedAnswers;
    attempt.score = score;
    attempt.correctAnswers = correctAnswers;
    attempt.wrongAnswers = wrongAnswers;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.timeSpent = timeSpent;
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    
    await attempt.save();
    
    res.json({
      attempt,
      result: {
        score,
        totalQuestions: quiz.questions.length,
        correctAnswers,
        wrongAnswers,
        percentage,
        passed,
        passingScore: quiz.passingScore
      }
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Get user's quiz attempts
router.get('/:id/attempts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const attempts = await FirebaseQuizAttempt.findByUser(req.user.userId, id);
    res.json(attempts);
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

// Get user's best attempt for a quiz
router.get('/:id/best-attempt', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const bestAttempt = await FirebaseQuizAttempt.getBestAttempt(req.user.userId, id);
    res.json(bestAttempt);
  } catch (error) {
    console.error('Error fetching best attempt:', error);
    res.status(500).json({ error: 'Failed to fetch best attempt' });
  }
});

// Get user's quiz history
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const attempts = await FirebaseQuizAttempt.findByUser(req.user.userId);
    res.json(attempts);
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ error: 'Failed to fetch quiz history' });
  }
});

// Admin routes
router.post('/admin/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const quizData = {
      ...req.body,
      createdBy: req.user.userId
    };
    
    const quiz = await FirebaseQuiz.create(quizData);
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { subjectId, semester, branch, isActive } = req.query;
    
    let query = {};
    if (subjectId) query.subjectId = subjectId;
    if (semester) query.semester = parseInt(semester);
    if (branch) query.branch = branch;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const quizzes = await FirebaseQuiz.find(query);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching all quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const quiz = await FirebaseQuiz.findByIdAndUpdate(id, req.body);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const quiz = await FirebaseQuiz.findByIdAndDelete(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

router.get('/admin/:id/attempts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const attempts = await FirebaseQuizAttempt.findByQuiz(id);
    res.json(attempts);
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

router.get('/admin/:id/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await FirebaseQuizAttempt.getStats(id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    res.status(500).json({ error: 'Failed to fetch quiz stats' });
  }
});

router.get('/admin/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const quizStats = await FirebaseQuiz.getStats();
    const attemptStats = await FirebaseQuizAttempt.getStats();
    
    res.json({
      quizzes: quizStats,
      attempts: attemptStats
    });
  } catch (error) {
    console.error('Error fetching quiz overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch quiz stats' });
  }
});

export default router;
