import express, { Request, Response } from 'express';
import Problem from '../models/Problem';
import { isAuthenticated, isAdmin, isAdminOrContributor } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

// Submit a problem (contributors and admins)
router.post('/', isAdminOrContributor, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const problem = await Problem.create({ ...req.body, author: user._id });
    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all problems (admin/contributor can see all, students see only approved)
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
