import express, { Request, Response } from 'express';
import Result from '../models/Result';
import Test from '../models/Test';
import User from '../models/User';
import { isAuthenticated } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

// Global leaderboard — all users ranked by average score %, zero-test users at bottom
router.get('/global', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Aggregate per-user stats from results
    const userStats = await Result.aggregate([
      {
        $group: {
          _id: '$user',
          avgScore: {
            $avg: {
              $cond: [
                { $gt: ['$maxScore', 0] },
                { $multiply: [{ $divide: ['$totalScore', '$maxScore'] }, 100] },
                0,
              ],
            },
          },
          totalTests: { $sum: 1 },
          bestRank: { $min: '$rank' },
          totalScore: { $sum: '$totalScore' },
        },
      },
    ]);

    const statsMap = new Map(userStats.map((s) => [s._id.toString(), s]));

    // Fetch all users
    const allUsers = await User.find({}, 'name picture _id').lean();

    // Merge: users with stats get avgScore, others get null
    const merged = allUsers.map((u) => {
      const stats = statsMap.get(u._id.toString());
      return {
        _id: u._id.toString(),
        avgScore: stats ? Math.round(stats.avgScore * 100) / 100 : null as number | null,
        totalTests: stats?.totalTests ?? 0,
        bestRank: stats?.bestRank ?? null as number | null,
        totalScore: stats?.totalScore ?? 0,
        user: { _id: u._id.toString(), name: u.name, picture: u.picture },
      };
    });

    // Sort: higher avgScore first, null (no tests) at bottom
    merged.sort((a, b) => {
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return b.avgScore - a.avgScore;
    });

    // Assign ranks with tie handling (same avgScore = same rank)
    const noTestRank = merged.length; // all no-test users share the last rank
    let currentRank = 1;
    const ranked = merged.map((entry, i) => {
      let rank: number;
      if (entry.avgScore === null) {
        rank = noTestRank;
      } else {
        if (i === 0 || entry.avgScore !== merged[i - 1].avgScore) {
          currentRank = i + 1;
        }
        rank = currentRank;
      }
      return { ...entry, avgRank: rank, rank };
    });

    const total = ranked.length;
    const paginated = ranked.slice(skip, skip + limit);

    res.json({ leaderboard: paginated, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Leaderboard] global error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test-specific leaderboard — only shows after admin publishes it
router.get('/test/:testId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const test = await Test.findById(req.params.testId);

    if (!test) return res.status(404).json({ message: 'Test not found' });

    if (!test.leaderboardPublishedAt && user.role !== 'admin') {
      return res.status(403).json({ message: 'Leaderboard not yet published' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const results = await Result.find({ test: req.params.testId })
      .sort({ rank: 1, totalScore: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name picture');

    const total = await Result.countDocuments({ test: req.params.testId });
    const myResult = await Result.findOne({ user: user._id, test: req.params.testId });

    res.json({
      results,
      total,
      page,
      pages: Math.ceil(total / limit),
      myResult,
      test: { _id: test._id, title: test.title, type: test.type },
    });
  } catch (error) {
    console.error('[Leaderboard] test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
