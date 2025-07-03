const express = require('express');
const { authenticateToken, requireAdmin } = require('./auth');
const router = express.Router();

// Mock quizzes data (in real app, you'd have Quiz and QuizAttempt models)
let quizzes = [
    {
        id: '1',
        title: 'Basic Electronics Quiz',
        description: 'Test your knowledge of basic electronics',
        subject: 'Basic Electronics',
        semester: 'Semester 2',
        branch: 'Electronics & Telecommunication',
        questions: [
            {
                id: '1',
                question: 'What is the unit of resistance?',
                options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
                correctAnswer: 2
            }
        ],
        timeLimit: 30, // minutes
        isActive: true,
        createdAt: new Date(),
        createdBy: 'admin'
    }
];

let quizAttempts = [];

// Get all quizzes
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { branch, semester, subject } = req.query;
        let filteredQuizzes = quizzes.filter(q => q.isActive);

        if (branch) filteredQuizzes = filteredQuizzes.filter(q => q.branch === branch);
        if (semester) filteredQuizzes = filteredQuizzes.filter(q => q.semester === semester);
        if (subject) filteredQuizzes = filteredQuizzes.filter(q => q.subject === subject);

        res.json(filteredQuizzes);
    } catch (error) {
        console.error('Quizzes fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// Get quiz by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const quiz = quizzes.find(q => q.id === req.params.id);
        
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Don't send correct answers to students
        const quizForStudent = {
            ...quiz,
            questions: quiz.questions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options
            }))
        };

        res.json(quizForStudent);
    } catch (error) {
        console.error('Quiz fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

// Create new quiz (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, description, subject, semester, branch, questions, timeLimit } = req.body;

        const quiz = {
            id: Date.now().toString(),
            title,
            description,
            subject,
            semester,
            branch,
            questions: questions || [],
            timeLimit: timeLimit || 30,
            isActive: true,
            createdAt: new Date(),
            createdBy: req.user.name
        };

        quizzes.push(quiz);

        res.status(201).json({
            message: 'Quiz created successfully',
            quiz
        });
    } catch (error) {
        console.error('Quiz creation error:', error);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

// Submit quiz attempt
router.post('/:id/attempt', authenticateToken, async (req, res) => {
    try {
        const { answers } = req.body;
        const quiz = quizzes.find(q => q.id === req.params.id);
        
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Calculate score
        let correctAnswers = 0;
        quiz.questions.forEach((question, index) => {
            if (answers[index] === question.correctAnswer) {
                correctAnswers++;
            }
        });

        const score = (correctAnswers / quiz.questions.length) * 100;

        const attempt = {
            id: Date.now().toString(),
            quizId: req.params.id,
            userId: req.user.userId,
            userName: req.user.name,
            answers,
            score,
            correctAnswers,
            totalQuestions: quiz.questions.length,
            submittedAt: new Date()
        };

        quizAttempts.push(attempt);

        res.json({
            message: 'Quiz submitted successfully',
            attempt
        });
    } catch (error) {
        console.error('Quiz submission error:', error);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

// Get quiz attempts (admin only)
router.get('/:id/attempts', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const attempts = quizAttempts.filter(a => a.quizId === req.params.id);
        res.json(attempts);
    } catch (error) {
        console.error('Quiz attempts fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch quiz attempts' });
    }
});

// Get user's quiz attempts
router.get('/user/attempts', authenticateToken, async (req, res) => {
    try {
        const attempts = quizAttempts.filter(a => a.userId === req.user.userId);
        res.json(attempts);
    } catch (error) {
        console.error('User attempts fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user attempts' });
    }
});

// Update quiz (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const quiz = quizzes.find(q => q.id === req.params.id);
        
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const { title, description, subject, semester, branch, questions, timeLimit, isActive } = req.body;
        
        if (title) quiz.title = title;
        if (description) quiz.description = description;
        if (subject) quiz.subject = subject;
        if (semester) quiz.semester = semester;
        if (branch) quiz.branch = branch;
        if (questions) quiz.questions = questions;
        if (timeLimit) quiz.timeLimit = timeLimit;
        if (typeof isActive === 'boolean') quiz.isActive = isActive;

        res.json({
            message: 'Quiz updated successfully',
            quiz
        });
    } catch (error) {
        console.error('Quiz update error:', error);
        res.status(500).json({ error: 'Failed to update quiz' });
    }
});

// Delete quiz (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const index = quizzes.findIndex(q => q.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        quizzes.splice(index, 1);

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Quiz delete error:', error);
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
});

module.exports = router; 