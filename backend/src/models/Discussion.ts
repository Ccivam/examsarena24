import mongoose, { Document, Schema } from 'mongoose';

export interface IReply {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IComment {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  replies: IReply[];
  createdAt: Date;
}

export interface IDiscussion extends Document {
  title: string;
  content: string;
  test?: mongoose.Types.ObjectId;
  type: 'editorial' | 'announcement' | 'general';
  author: mongoose.Types.ObjectId;
  comments: IComment[];
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const CommentSchema = new Schema<IComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    replies: [ReplySchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const DiscussionSchema = new Schema<IDiscussion>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    test: { type: Schema.Types.ObjectId, ref: 'Test' },
    type: {
      type: String,
      enum: ['editorial', 'announcement', 'general'],
      default: 'general',
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comments: [CommentSchema],
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DiscussionSchema.index({ pinned: -1, createdAt: -1 });

export default mongoose.model<IDiscussion>('Discussion', DiscussionSchema);
