import express, { Request, Response } from 'express';
import Test from '../models/Test';
import Registration from '../models/Registration';
import Submission from '../models/Submission';
import Result from '../models/Result'; // still used in /review route
import { isAuthenticated, isAdmin } from '../middleware/auth';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';
import { calculateResultsForTest } from '../utils/calculateResults';
import { sendNewTestNotification } from '../config/mailer';

const router = express.Router();

// Get all tests (upcoming and past)
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status as string;

    const tests = await Test.find(filter)
      .select('-problems')
      .sort({ startTime: -1 })
      .populate('createdBy', 'name');

    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single test (without answers)
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const test = await Test.findById(req.params.id).populate({
      path: 'problems.problem',
      select: '-correctOption -explanation', // hide answers
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const user = req.user as IUser;
    const registration = await Registration.findOne({
      user: user._id,
      test: test._id,
    });

    res.json({ test, registration });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Registration is handled via /api/payments routes (Razorpay for paid, register-free for free)

// Start a test (enter test room)
router.post('/:id/start', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id).populate({
      path: 'problems.problem',
      select: '-correctOption -explanation',
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const now = new Date();

    // Auto-update status based on real time (in case scheduler hasn't run yet)
    if (test.status === 'upcoming' && now >= test.startTime && now < test.endTime) {
      test.status = 'live';
      await test.save();
    } else if (test.status === 'live' && now >= test.endTime) {
      test.status = 'completed';
      await test.save();
    }

    if (test.status === 'completed' || now >= test.endTime) {
      return res.status(400).json({ message: 'This exam has ended.' });
    }

    if (test.status !== 'live' || now < test.startTime) {
      const startsIn = Math.ceil((test.startTime.getTime() - now.getTime()) / 60000);
      return res.status(400).json({ message: `Exam hasn't started yet. Starts in ${startsIn} minute(s).` });
    }

    // Check registration
    const registration = await Registration.findOne({ user: user._id, test: test._id });
    if (!registration) {
      return res.status(403).json({ message: 'Not registered for this test' });
    }

    if (registration.paymentStatus === 'pending') {
      return res.status(403).json({ message: 'Payment verification pending. Please wait for admin approval.' });
    }

    if (registration.paymentStatus === 'rejected') {
      return res.status(403).json({ message: 'Payment was rejected. Please contact support.' });
    }

    // Get or create submission
    let submission = await Submission.findOne({ user: user._id, test: test._id });

    // Block re-entry if already submitted (e.g. auto-submitted due to fullscreen exit)
    if (submission?.isSubmitted) {
      return res.status(403).json({ message: 'You have already submitted this test and cannot re-enter.' });
    }

    if (!submission) {
      submission = await Submission.create({
        user: user._id,
        test: test._id,
        answers: [],
        startedAt: new Date(),
      });
    }

    res.json({ test, submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Save answer (can be changed during test)
router.put('/:id/answer', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const now = new Date();
    if (now < test.startTime || now >= test.endTime) {
      return res.status(400).json({ message: 'Test is not currently active' });
    }

    const { problemId, selectedOption } = req.body;

    let submission = await Submission.findOne({ user: user._id, test: test._id });
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found. Start the test first.' });
    }

    if (submission.isSubmitted) {
      return res.status(400).json({ message: 'Test already submitted' });
    }

    // Update or add answer
    const existingAnswerIndex = submission.answers.findIndex(
      (a) => a.problem.toString() === problemId
    );

    if (existingAnswerIndex >= 0) {
      submission.answers[existingAnswerIndex].selectedOption = selectedOption;
      submission.answers[existingAnswerIndex].submittedAt = new Date();
    } else {
      submission.answers.push({
        problem: new mongoose.Types.ObjectId(problemId),
        selectedOption,
        submittedAt: new Date(),
      });
    }

    await submission.save();
    res.json({ message: 'Answer saved', submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Final submit test
router.post('/:id/submit', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    let submission = await Submission.findOne({ user: user._id, test: test._id });
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.isSubmitted) {
      return res.status(400).json({ message: 'Test already submitted' });
    }

    submission.isSubmitted = true;
    submission.submittedAt = new Date();
    await submission.save();

    res.json({ message: 'Test submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get test review (only after solutions published)
router.get('/:id/review', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id).populate({
      path: 'problems.problem',
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const now = new Date();
    const examEnded = now >= test.endTime;

    // Allow viewing once exam has ended (solutions visible to all); admins always have access
    if (!examEnded && user.role !== 'admin') {
      return res.status(403).json({ message: 'Solutions will be available after the exam ends.' });
    }

    const solutionsVisible = examEnded || user.role === 'admin';
    const submission = await Submission.findOne({ user: user._id, test: test._id });
    const result = await Result.findOne({ user: user._id, test: test._id });

    res.json({ test, submission, result, solutionsVisible });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create test
router.post('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.create({ ...req.body, createdBy: user._id });
    res.status(201).json(test);

    // Fire-and-forget: notify all users about new test
    User.find({}, 'name email').then(users => {
      for (const u of users) {
        if (u.email) {
          sendNewTestNotification(u.email, u.name, {
            title: test.title,
            _id: test._id.toString(),
            startTime: test.startTime,
            fee: test.fee,
            type: test.type,
          }).catch(() => {});
        }
      }
    }).catch(() => {});
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update test
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Manually recalculate results for a test
router.post('/:id/calculate-results', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (user.role !== 'super_admin' && test.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not your test' });
    }
    const count = await calculateResultsForTest(req.params.id);
    res.json({ message: `Results calculated for ${count} participants` });
  } catch (error: any) {
    if (error.message === 'Test not found') return res.status(404).json({ message: 'Test not found' });
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
