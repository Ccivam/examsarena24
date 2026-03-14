import express, { Request, Response } from 'express';
import Discussion from '../models/Discussion';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import User, { IUser } from '../models/User';
import { sendAnnouncementNotification, sendCommentNotification, sendReplyNotification } from '../config/mailer';

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

// Get single discussion with all comments + replies
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'name picture role')
      .populate('test', 'title _id')
      .populate('comments.author', 'name picture role')
      .populate('comments.replies.author', 'name picture role');

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

    // Fire-and-forget: notify all users for announcements and editorials
    if (discussion.type === 'announcement' || discussion.type === 'editorial') {
      User.find({}, 'name email').then(users => {
        for (const u of users) {
          if (u.email) {
            sendAnnouncementNotification(u.email, u.name, {
              title: discussion.title,
              _id: discussion._id.toString(),
              type: discussion.type,
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }
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

    const discussion = await Discussion.findById(req.params.id).populate('author', 'name email');
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    discussion.comments.push({ author: user._id, content: content.trim(), replies: [] } as any);
    await discussion.save();

    await discussion.populate('comments.author', 'name picture role');
    const newComment = discussion.comments[discussion.comments.length - 1];
    res.status(201).json(newComment);

    // Notify discussion author (if someone else commented)
    const discussionAuthor = discussion.author as any;
    if (discussionAuthor._id.toString() !== user._id.toString() && discussionAuthor.email) {
      sendCommentNotification(
        discussionAuthor.email,
        discussionAuthor.name,
        user.name,
        { title: discussion.title, _id: discussion._id.toString() }
      ).catch(() => {});
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete comment — only discussion author OR comment author
router.delete('/:id/comments/:commentId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    const commentIndex = discussion.comments.findIndex(
      c => c._id.toString() === req.params.commentId
    );
    if (commentIndex === -1) return res.status(404).json({ message: 'Comment not found' });

    const comment = discussion.comments[commentIndex];
    const isCommentAuthor = comment.author.toString() === user._id.toString();
    const isDiscussionAuthor = discussion.author.toString() === user._id.toString();

    if (!isCommentAuthor && !isDiscussionAuthor) {
      return res.status(403).json({ message: 'Only the discussion author or comment author can delete this comment' });
    }

    discussion.comments.splice(commentIndex, 1);
    await discussion.save();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add reply to a comment
router.post('/:id/comments/:commentId/replies', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Reply cannot be empty' });

    const discussion = await Discussion.findById(req.params.id).populate('author', 'name email');
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    const comment = discussion.comments.find(c => c._id.toString() === req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.replies.push({ author: user._id, content: content.trim() } as any);
    await discussion.save();

    await discussion.populate('comments.replies.author', 'name picture role');

    // Re-fetch the comment and its last reply to return
    const updatedComment = discussion.comments.find(c => c._id.toString() === req.params.commentId)!;
    const newReply = updatedComment.replies[updatedComment.replies.length - 1];
    res.status(201).json(newReply);

    // Notify comment author (if someone else replied)
    const fullComment = await Discussion.findById(req.params.id)
      .populate('comments.author', 'name email');
    if (fullComment) {
      const targetComment = fullComment.comments.find(c => c._id.toString() === req.params.commentId);
      const commentAuthor = targetComment?.author as any;
      if (commentAuthor && commentAuthor._id.toString() !== user._id.toString() && commentAuthor.email) {
        sendReplyNotification(
          commentAuthor.email,
          commentAuthor.name,
          user.name,
          { title: discussion.title, _id: discussion._id.toString() }
        ).catch(() => {});
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete reply — only discussion author OR reply author
router.delete('/:id/comments/:commentId/replies/:replyId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    const comment = discussion.comments.find(c => c._id.toString() === req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const replyIndex = comment.replies.findIndex(r => r._id.toString() === req.params.replyId);
    if (replyIndex === -1) return res.status(404).json({ message: 'Reply not found' });

    const reply = comment.replies[replyIndex];
    const isReplyAuthor = reply.author.toString() === user._id.toString();
    const isDiscussionAuthor = discussion.author.toString() === user._id.toString();

    if (!isReplyAuthor && !isDiscussionAuthor) {
      return res.status(403).json({ message: 'Only the discussion author or reply author can delete this reply' });
    }

    comment.replies.splice(replyIndex, 1);
    await discussion.save();
    res.json({ message: 'Reply deleted' });
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
