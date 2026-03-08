import express, { Request, Response } from 'express';
import Discussion from '../models/Discussion';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

// List all discussions (newest first, pinned on top)
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const discussions = await Discussion.find()
      .populate('author', 'name picture')
      .populate('test', 'title')
      .sort({ pinned: -1, createdAt: -1 });

    const result = discussions.map(d => ({
      _id: d._id,
      title: d.title,
      type: d.type,
      test: d.test,
      author: d.author,
      pinned: d.pinned,
      commentCount: d.comments.length,
      createdAt: d.createdAt,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single discussion with all comments
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'name picture role')
      .populate('test', 'title _id')
      .populate('comments.author', 'name picture role');

    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });
    res.json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create discussion (admin only)
router.post('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { title, content, type, test, pinned } = req.body;

    const discussion = await Discussion.create({
      title,
      content,
      type: type || 'general',
      test: test || undefined,
      author: user._id,
      pinned: pinned || false,
    });

    await discussion.populate('author', 'name picture');
    await discussion.populate('test', 'title');

    res.status(201).json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment (any authenticated user)
router.post('/:id/comments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    discussion.comments.push({ author: user._id, content: content.trim() } as any);
    await discussion.save();

    // Return only the new comment populated
    await discussion.populate('comments.author', 'name picture role');
    const newComment = discussion.comments[discussion.comments.length - 1];
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete comment (own comment or admin)
router.delete('/:id/comments/:commentId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    const comment = discussion.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.author.toString() === user._id.toString();
    const isAdminUser = user.role === 'admin' || user.role === 'super_admin';
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    comment.deleteOne();
    await discussion.save();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete discussion (admin only)
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    await Discussion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Discussion deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
