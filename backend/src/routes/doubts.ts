import express, { Request, Response } from 'express';
import Doubt from '../models/Doubt';
import User from '../models/User';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { IUser } from '../models/User';
import {
  sendDoubtRaisedEmail,
  sendDoubtAcceptedEmail,
  sendDoubtMarkedClearedEmail,
} from '../config/mailer';

const router = express.Router();

// ── Admin stats (must come before /:id routes) ────────────────────────────
router.get('/admin/stats', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const [resolved, flagged, active] = await Promise.all([
      Doubt.countDocuments({ acceptedBy: user._id, status: 'resolved' }),
      Doubt.countDocuments({ acceptedBy: user._id, status: 'flagged' }),
      Doubt.countDocuments({ acceptedBy: user._id, status: { $in: ['accepted', 'pending_closure'] } }),
    ]);
    res.json({ resolved, flagged, active });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Raise a doubt (student) ───────────────────────────────────────────────
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { title, description, subject } = req.body;
    if (!title?.trim() || !description?.trim())
      return res.status(400).json({ message: 'Title and description are required' });

    const doubt = await Doubt.create({
      student: user._id,
      title: title.trim(),
      description: description.trim(),
      subject: subject || 'General',
    });

    // Email all admins (fire-and-forget)
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('name email');
    for (const admin of admins) {
      if (admin.email) {
        sendDoubtRaisedEmail(
          admin.email, admin.name, user.name, doubt.title, (doubt._id as any).toString()
        ).catch(() => {});
      }
    }

    res.status(201).json(doubt);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── List doubts ───────────────────────────────────────────────────────────
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    let filter: any = {};

    if (user.role === 'student') {
      filter.student = user._id;
    } else {
      const view = req.query.view as string;
      if (view === 'mine') {
        filter.acceptedBy = user._id;
      } else {
        // Open doubts available to accept + doubts this admin already handles
        filter.$or = [{ status: 'open' }, { acceptedBy: user._id }];
      }
    }

    const doubts = await Doubt.find(filter)
      .select('-messages')
      .populate('student', 'name picture')
      .populate('acceptedBy', 'name picture')
      .sort({ createdAt: -1 });

    res.json(doubts);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get single doubt with messages ────────────────────────────────────────
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const doubt = await Doubt.findById(req.params.id)
      .populate('student', 'name picture')
      .populate('acceptedBy', 'name picture')
      .populate('messages.sender', 'name picture role');

    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    const isStudent = (doubt.student as any)._id.toString() === user._id.toString();
    const isAccepted = doubt.acceptedBy && (doubt.acceptedBy as any)._id.toString() === user._id.toString();
    const isAdminUser = user.role === 'admin' || user.role === 'super_admin';

    if (!isStudent && !isAccepted && !isAdminUser)
      return res.status(403).json({ message: 'Access denied' });

    res.json(doubt);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Admin accepts a doubt (open → accepted) ───────────────────────────────
router.post('/:id/accept', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const doubt = await Doubt.findById(req.params.id).populate('student', 'name email');
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    if (doubt.status !== 'open')
      return res.status(400).json({ message: 'This doubt has already been accepted by another teacher.' });

    doubt.status = 'accepted';
    doubt.acceptedBy = user._id as any;
    doubt.acceptedAt = new Date();
    await doubt.save();

    const student = doubt.student as any;
    if (student?.email) {
      sendDoubtAcceptedEmail(
        student.email, student.name, user.name, doubt.title, (doubt._id as any).toString()
      ).catch(() => {});
    }

    res.json(doubt);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Send a message ────────────────────────────────────────────────────────
router.post('/:id/message', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    const isStudent = doubt.student.toString() === user._id.toString();
    const isAccepted = doubt.acceptedBy && doubt.acceptedBy.toString() === user._id.toString();

    if (!isStudent && !isAccepted)
      return res.status(403).json({ message: 'You are not part of this doubt session' });
    if (!['accepted', 'pending_closure'].includes(doubt.status))
      return res.status(400).json({ message: 'Chat is closed' });

    doubt.messages.push({ sender: user._id, content: content.trim(), createdAt: new Date() } as any);
    await doubt.save();

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Admin marks as cleared (accepted → pending_closure) ───────────────────
router.post('/:id/mark-cleared', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const doubt = await Doubt.findById(req.params.id).populate('student', 'name email');
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    if (doubt.acceptedBy?.toString() !== user._id.toString())
      return res.status(403).json({ message: 'Not your doubt session' });
    if (doubt.status !== 'accepted')
      return res.status(400).json({ message: 'Cannot mark cleared in current status' });

    doubt.status = 'pending_closure';
    doubt.adminMarkedCleared = true;
    await doubt.save();

    const student = doubt.student as any;
    if (student?.email) {
      sendDoubtMarkedClearedEmail(
        student.email, student.name, doubt.title, (doubt._id as any).toString()
      ).catch(() => {});
    }

    res.json(doubt);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Student agrees → resolved ─────────────────────────────────────────────
router.post('/:id/student-agree', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    if (doubt.student.toString() !== user._id.toString())
      return res.status(403).json({ message: 'Access denied' });
    if (doubt.status !== 'pending_closure')
      return res.status(400).json({ message: 'No pending closure' });

    doubt.status = 'resolved';
    doubt.studentAgreed = true;
    doubt.closedAt = new Date();
    await doubt.save();

    res.json(doubt);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Student disagrees → back to accepted ──────────────────────────────────
router.post('/:id/student-disagree', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    if (doubt.student.toString() !== user._id.toString())
      return res.status(403).json({ message: 'Access denied' });
    if (doubt.status !== 'pending_closure')
      return res.status(400).json({ message: 'No pending closure' });

    doubt.status = 'accepted';
    doubt.adminMarkedCleared = false;
    await doubt.save();

    res.json(doubt);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Admin force-closes (→ flagged = not cleared) ──────────────────────────
router.post('/:id/force-close', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    if (doubt.acceptedBy?.toString() !== user._id.toString())
      return res.status(403).json({ message: 'Not your doubt session' });
    if (!['accepted', 'pending_closure'].includes(doubt.status))
      return res.status(400).json({ message: 'Already closed' });

    doubt.status = 'flagged';
    doubt.closedAt = new Date();
    await doubt.save();

    res.json(doubt);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
