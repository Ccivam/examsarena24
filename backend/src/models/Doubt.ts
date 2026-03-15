import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IDoubt extends Document {
  student: mongoose.Types.ObjectId;
  title: string;
  description: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'General';
  // open → accepted → pending_closure → resolved
  //                              └───→ accepted (student disagrees)
  // open/accepted → flagged (admin force-closes = not cleared)
  status: 'open' | 'accepted' | 'pending_closure' | 'resolved' | 'flagged';
  acceptedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  closedAt?: Date;
  adminMarkedCleared: boolean;
  studentAgreed: boolean;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const DoubtSchema = new Schema<IDoubt>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 3000 },
    subject: { type: String, enum: ['Physics', 'Chemistry', 'Mathematics', 'General'], default: 'General' },
    status: {
      type: String,
      enum: ['open', 'accepted', 'pending_closure', 'resolved', 'flagged'],
      default: 'open',
    },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: { type: Date },
    closedAt: { type: Date },
    adminMarkedCleared: { type: Boolean, default: false },
    studentAgreed: { type: Boolean, default: false },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

DoubtSchema.index({ student: 1, createdAt: -1 });
DoubtSchema.index({ status: 1, createdAt: -1 });
DoubtSchema.index({ acceptedBy: 1, status: 1 });

export default mongoose.model<IDoubt>('Doubt', DoubtSchema);
