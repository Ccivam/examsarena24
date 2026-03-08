import express, { Request, Response } from 'express';
import Problem from '../models/Problem';
import PracticeSolve from '../models/PracticeSolve';
import Test from '../models/Test';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

// Get paginated problems for practice with solve status
router.get('/practice', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Only show problems from tests that have already ended
    const endedTests = await Test.find({ endTime: { $lt: new Date() } }).select('problems');
    const eligibleProblemIds = [...new Set(
      endedTests.flatMap(t => t.problems.map(p => p.problem.toString()))
    )];

    const filter = { status: 'approved', _id: { $in: eligibleProblemIds } };

    const total = await Problem.countDocuments(filter);
    const problems = await Problem.find(filter)
      .select('title subject difficulty tags')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const problemIds = problems.map(p => p._id);
    const solves = await PracticeSolve.find({ user: user._id, problem: { $in: problemIds } });
    const solveMap = new Map(solves.map(s => [s.problem.toString(), s]));

    const result = problems.map(p => ({
      ...p.toObject(),
      solved: solveMap.has(p._id.toString()),
      correct: solveMap.get(p._id.toString())?.correct || false,
    }));

    res.json({ problems: result, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit answer for practice
router.post('/:id/practice-submit', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { selectedOption } = req.body;
    if (!selectedOption) return res.status(400).json({ message: 'selectedOption is required' });

    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const correct = problem.correctOption === selectedOption;

    const existing = await PracticeSolve.findOne({ user: user._id, problem: problem._id });
    if (existing) {
      existing.lastSelectedOption = selectedOption;
      existing.correct = existing.correct || correct;
      existing.attempts += 1;
      existing.solvedAt = new Date();
      await existing.save();
    } else {
      await PracticeSolve.create({
        user: user._id,
        problem: problem._id,
        lastSelectedOption: selectedOption,
        correct,
        attempts: 1,
      });
    }

    res.json({ correct, correctOption: problem.correctOption, explanation: problem.explanation });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit a problem (admins only)
router.post('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const problem = await Problem.create({ ...req.body, author: user._id });
    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all problems (admin/super_admin can see all, students see only approved)
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { subject, difficulty, status } = req.query;
    const filter: Record<string, unknown> = {};

    if (subject) filter.subject = subject;
    if (difficulty) filter.difficulty = difficulty;

    if (user.role === 'student') {
      filter.status = 'approved';
    } else if (status) {
      filter.status = status;
    }

    const problems = await Problem.find(filter)
      .select('-correctOption -explanation')
      .populate('author', 'name')
      .sort({ createdAt: -1 });

    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single problem (without answer for non-admin)
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const selectFields = user.role === 'admin' ? '' : '-correctOption -explanation';
    const problem = await Problem.findById(req.params.id).select(selectFields).populate('author', 'name');

    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: approve/reject problem
router.put('/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: update problem
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
