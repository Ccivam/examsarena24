import express, { Request, Response } from 'express';
import Test from '../models/Test';
import Problem from '../models/Problem';
import Registration from '../models/Registration';
import User from '../models/User';
import Result from '../models/Result';
import Submission from '../models/Submission';
import { isAdmin } from '../middleware/auth';
import { IUser } from '../models/User';
import { sendLeaderboardPublishedEmail } from '../config/mailer';

const canManageTest = (test: any, user: IUser) =>
  user.role === 'super_admin' || test.createdBy.toString() === user._id.toString();

const router = express.Router();

// Dashboard stats
router.get('/stats', isAdmin, async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalTests, totalProblems, pendingPayments, pendingProblems] =
      await Promise.all([
        User.countDocuments(),
        Test.countDocuments(),
        Problem.countDocuments(),
        Registration.countDocuments({ paymentStatus: 'pending' }),
        Problem.countDocuments({ status: 'pending' }),
      ]);

    const liveTests = await Test.find({ status: 'live' }).select('title startTime endTime');
    const upcomingTests = await Test.find({ status: 'upcoming' })
      .select('title startTime fee')
      .sort({ startTime: 1 })
      .limit(5);

    res.json({
      totalUsers,
      totalTests,
      totalProblems,
      pendingPayments,
      pendingProblems,
      liveTests,
      upcomingTests,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Publish solutions for a test
router.put('/tests/:id/publish-solutions', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!canManageTest(test, user)) return res.status(403).json({ message: 'Not your test' });
    test.solutionPublishedAt = new Date();
    await test.save();
    res.json({ message: 'Solutions published', test });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Publish leaderboard for a test
router.put('/tests/:id/publish-leaderboard', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!canManageTest(test, user)) return res.status(403).json({ message: 'Not your test' });
    const resultsExist = await Result.countDocuments({ test: req.params.id });
    if (resultsExist === 0) {
      return res.status(400).json({ message: 'Calculate results first before publishing leaderboard.' });
    }
    test.leaderboardPublishedAt = new Date();
    await test.save();

    // Email all registered users
    const registrations = await Registration.find({ test: req.params.id })
      .populate<{ user: { name: string; email: string } }>('user', 'name email');
    const emailPromises = registrations.map(reg =>
      sendLeaderboardPublishedEmail(reg.user.email, reg.user.name, { title: test.title, _id: test._id.toString() })
        .catch(() => {})
    );
    await Promise.all(emailPromises);

    res.json({ message: 'Leaderboard published', test });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change test status (upcoming -> live -> completed)
router.put('/tests/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { status } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!canManageTest(test, user)) return res.status(403).json({ message: 'Not your test' });
    test.status = status;
    await test.save();
    res.json({ message: `Test status updated to ${status}`, test });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tests created by current admin
router.get('/my-tests', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const filter = user.role === 'super_admin' ? {} : { createdBy: user._id };
    const tests = await Test.find(filter)
      .select('-problems')
      .sort({ startTime: -1 })
      .populate('createdBy', 'name');
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all approved problems (for adding to a test)
router.get('/problems/approved', isAdmin, async (req: Request, res: Response) => {
  try {
    const problems = await Problem.find({ status: 'approved' })
      .select('title subject difficulty marks negativeMarks')
      .sort({ subject: 1, createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update problems list on a test
router.put('/tests/:id/problems', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!canManageTest(test, user)) return res.status(403).json({ message: 'Not your test' });
    const { problemIds } = req.body;
    test.problems = problemIds.map((id: string, i: number) => ({ problem: id, order: i + 1 }));
    await test.save();
    await test.populate('problems.problem', 'title subject');
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all problems (admin - with filter)
router.get('/problems', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const problems = await Problem.find(filter)
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get submissions for a test (admin view)
router.get('/tests/:id/submissions', isAdmin, async (req: Request, res: Response) => {
  try {
    const submissions = await Submission.find({ test: req.params.id, isSubmitted: true })
      .populate('user', 'name email')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all registrations for a test (admin view)
router.get('/tests/:id/registrations', isAdmin, async (req: Request, res: Response) => {
  try {
    const registrations = await Registration.find({ test: req.params.id })
      .populate('user', 'name email picture')
      .sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users currently taking the test (submitted = false, startedAt exists)
router.get('/tests/:id/live', isAdmin, async (req: Request, res: Response) => {
  try {
    const live = await Submission.find({ test: req.params.id, isSubmitted: false })
      .populate('user', 'name email picture')
      .sort({ startedAt: -1 });
    res.json(live);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
