import express, { Request, Response } from 'express';
import User from '../models/User';
import Result from '../models/Result';
import Registration from '../models/Registration';
import PracticeSolve from '../models/PracticeSolve';
import { isAuthenticated, isAdmin, isSuperAdmin } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

// Check username availability
router.get('/check-username', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const u = (req.query.u as string || '').toLowerCase().trim();
    if (!u) return res.status(400).json({ message: 'Username required' });
    if (!/^[a-z0-9_]{3,8}$/.test(u)) {
      return res.json({ available: false, message: '3–8 chars, letters/numbers/underscore only' });
    }
    const exists = await User.findOne({ username: u });
    res.json({ available: !exists });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Set / update username
router.put('/set-username', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as IUser;
    const username = (req.body.username as string || '').toLowerCase().trim();
    if (!username) return res.status(400).json({ message: 'Username required' });
    if (!/^[a-z0-9_]{3,8}$/.test(username)) {
      return res.status(400).json({ message: '3–8 chars, letters/numbers/underscore only' });
    }
    const exists = await User.findOne({ username, _id: { $ne: currentUser._id } });
    if (exists) return res.status(400).json({ message: 'Username already taken' });
    const updated = await User.findByIdAndUpdate(currentUser._id, { username }, { new: true }).select('-password');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const reqUser = req.user as IUser;
    const user = await User.findById(reqUser._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

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
    const problemsSolved = await PracticeSolve.countDocuments({ user: user._id, correct: true });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username || null,
        email: user.email,
        picture: user.picture,
        role: user.role,
        createdAt: user.createdAt,
      },
      stats: { totalTests, avgScore, bestRank, problemsSolved },
      results,
      registrations,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public user profile by ID or username
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const param = req.params.id;
    const user = await User.findOne(
      param.length === 24 ? { _id: param } : { username: param.toLowerCase() }
    ).select('name username picture createdAt role');
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

// Super admin: list all users
router.get('/', isSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Super admin: update user role
router.put('/:id/role', isSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const allowed = ['student', 'contributor', 'admin', 'super_admin'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
