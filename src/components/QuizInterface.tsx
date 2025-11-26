import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw,
  Trophy,
  Target,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  timeLimit: number;
  maxAttempts: number;
  passingScore: number;
}

interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
  }>;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  attemptNumber: number;
  status: string;
  completedAt: string;
}

interface QuizInterfaceProps {
  quiz: Quiz;
  onComplete?: (attempt: QuizAttempt) => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ quiz, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60); // Convert minutes to seconds
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  const startQuiz = async () => {
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttempt(data.attempt);
        setIsPlaying(true);
        setStartTime(Date.now());
        toast.success('Quiz started!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start quiz');
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast.error('Failed to start quiz');
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setIsPlaying(false);
      const timeSpent = (Date.now() - startTime) / 1000 / 60; // Convert to minutes

      const response = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          attemptId: attempt?.id,
          answers: Object.entries(answers).map(([questionId, selectedAnswer]) => ({
            questionId,
            selectedAnswer
          })),
          timeSpent
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAttempt(data.attempt);
        setIsCompleted(true);
        setShowResults(true);
        
        if (onComplete) {
          onComplete(data.attempt);
        }

        toast.success(
          data.attempt.passed 
            ? `Congratulations! You passed with ${data.attempt.percentage.toFixed(1)}%` 
            : `Quiz completed. Score: ${data.attempt.percentage.toFixed(1)}%`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(quiz.timeLimit * 60);
    setIsPlaying(false);
    setIsCompleted(false);
    setAttempt(null);
    setShowResults(false);
  };

  if (showResults && attempt) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Summary */}
          <div className="text-center">
            <div className={`text-6xl mb-4 ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
              {attempt.passed ? <Trophy /> : <Target />}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
              {attempt.passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h2>
            <p className="text-lg text-gray-600">
              You scored {attempt.score} out of {attempt.totalQuestions} questions
            </p>
            <p className={`text-3xl font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
              {attempt.percentage.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Passing score: {quiz.passingScore}%
            </p>
          </div>

          {/* Detailed Results */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{attempt.correctAnswers}</p>
              <p className="text-sm text-gray-600">Correct</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{attempt.wrongAnswers}</p>
              <p className="text-sm text-gray-600">Incorrect</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{attempt.timeSpent.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Minutes</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{attempt.attemptNumber}</p>
              <p className="text-sm text-gray-600">Attempt</p>
            </div>
          </div>

          {/* Question Review */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Question Review</h3>
            <div className="space-y-4">
              {quiz.questions.map((question, index) => {
                const userAnswer = answers[question.id];
                const isCorrect = userAnswer === question.correctAnswer;
                
                return (
                  <div key={question.id} className={`p-4 rounded-lg border ${
                    isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold mb-2">
                          {index + 1}. {question.question}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Your answer:</span> {userAnswer || 'Not answered'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Correct answer:</span> {question.correctAnswer}
                          </p>
                          {question.explanation && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Explanation:</span> {question.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={restartQuiz} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
            <Button onClick={() => window.location.href = '/quizzes'}>
              Back to Quizzes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isPlaying && !isCompleted) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
          <p className="text-gray-600">{quiz.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{quiz.questions.length}</p>
              <p className="text-sm text-gray-600">Questions</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{quiz.timeLimit}</p>
              <p className="text-sm text-gray-600">Minutes</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{quiz.passingScore}%</p>
              <p className="text-sm text-gray-600">Passing Score</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <RotateCcw className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{quiz.maxAttempts}</p>
              <p className="text-sm text-gray-600">Max Attempts</p>
            </div>
          </div>
          
          <Button onClick={startQuiz} className="w-full" size="lg">
            <Play className="h-5 w-5 mr-2" />
            Start Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{quiz.title}</CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
            <Badge variant="secondary">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </Badge>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress: {getProgressPercentage().toFixed(1)}%</span>
            <span>Answered: {getAnsweredCount()}/{quiz.questions.length}</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Question */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {currentQuestionIndex + 1}. {currentQuestion.question}
          </h3>
          
          <RadioGroup
            value={answers[currentQuestion.id] || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <Button onClick={handleSubmitQuiz} className="bg-green-600 hover:bg-green-700">
                Submit Quiz
              </Button>
            ) : (
              <Button onClick={handleNextQuestion}>
                Next Question
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigation */}
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {quiz.questions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
              className={`h-8 w-8 p-0 ${
                answers[quiz.questions[index].id] 
                  ? 'bg-green-100 text-green-800 border-green-300' 
                  : ''
              }`}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizInterface;
