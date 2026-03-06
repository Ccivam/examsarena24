import express, { Request, Response } from 'express';
import User from '../models/User';
import Result from '../models/Result';
import Registration from '../models/Registration';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

// Get current user profile
router.get('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;

    const results = await Result.find({ user: user._id })
      .populate('test', 'title type startTime status')
      .sort({ calculatedAt: -1 });

    const registrations = await Registration.find({ user: user._id })
      .populate('test', 'title startTime status fee')
      .sort({ createdAt: -1 });

    // Calculate stats
    const totalTests = results.length;
    const avgScore = totalTests > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.totalScore / r.maxScore) * 100, 0) / totalTests)
      : 0;
    const bestRank = totalTests > 0
      ? Math.min(...results.map(r => r.rank))
      : 0;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role,
        createdAt: (user as any).createdAt,
      },
      stats: { totalTests, avgScore, bestRank },
      results,
      registrations,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public user profile by ID
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('name picture createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const results = await Result.find({ user: user._id })
      .populate('test', 'title type startTime')
      .sort({ calculatedAt: -1 });

    const totalTests = results.length;
    const avgScore = totalTests > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.totalScore / r.maxScore) * 100, 0) / totalTests)
      : 0;
    const bestRank = totalTests > 0 ? Math.min(...results.map(r => r.rank)) : 0;

    res.json({
      user,
      stats: { totalTests, avgScore, bestRank },
      results,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: list all users
router.get('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: update user role
router.put('/:id/role', isAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
