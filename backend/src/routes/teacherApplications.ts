import express, { Request, Response } from 'express';
import TeacherApplication from '../models/TeacherApplication';
import User from '../models/User';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

// Student applies to become a teacher
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (user.role !== 'student')
      return res.status(400).json({ message: 'Only students can apply to become a teacher.' });

    const existing = await TeacherApplication.findOne({ user: user._id });
    if (existing)
      return res.status(400).json({ message: 'You have already submitted an application.', application: existing });

    const { motivation } = req.body;
    if (!motivation?.trim())
      return res.status(400).json({ message: 'Motivation is required.' });

    const application = await TeacherApplication.create({
      user: user._id,
      motivation: motivation.trim(),
    });

    res.status(201).json(application);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Student checks their own application status
router.get('/my', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const application = await TeacherApplication.findOne({ user: user._id });
    res.json(application || null);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: list all applications
router.get('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const applications = await TeacherApplication.find(filter)
      .populate('user', 'name email picture username')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: approve application
router.put('/:id/approve', isAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.user as IUser;
    const application = await TeacherApplication.findById(req.params.id).populate('user');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.status === 'approved')
      return res.status(400).json({ message: 'Already approved' });

    application.status = 'approved';
    application.reviewedBy = admin._id as any;
    application.reviewedAt = new Date();
    await application.save();

    // Upgrade user role to teacher
    await User.findByIdAndUpdate(application.user, { role: 'teacher' });

    res.json({ message: 'Approved. User is now a teacher.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: reject application
router.put('/:id/reject', isAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.user as IUser;
    const application = await TeacherApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.status = 'rejected';
    application.reviewedBy = admin._id as any;
    application.reviewedAt = new Date();
    await application.save();

    res.json({ message: 'Application rejected.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
