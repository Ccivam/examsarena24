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
  // open → awaiting_payment (if fee>0) → accepted → pending_closure → resolved
  //                                                              └───→ accepted (student disagrees)
  // open/awaiting_payment/accepted → flagged (teacher force-closes)
  status: 'open' | 'awaiting_payment' | 'accepted' | 'pending_closure' | 'resolved' | 'flagged';
  acceptedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  closedAt?: Date;
  adminMarkedCleared: boolean;
  studentAgreed: boolean;
  // Payment
  fee: number;
  paymentStatus: 'free' | 'pending' | 'verified';
  utrNumber?: string;
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
      enum: ['open', 'awaiting_payment', 'accepted', 'pending_closure', 'resolved', 'flagged'],
      default: 'open',
    },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: { type: Date },
    closedAt: { type: Date },
    adminMarkedCleared: { type: Boolean, default: false },
    studentAgreed: { type: Boolean, default: false },
    fee: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['free', 'pending', 'verified'], default: 'free' },
    utrNumber: { type: String },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

DoubtSchema.index({ student: 1, createdAt: -1 });
DoubtSchema.index({ status: 1, createdAt: -1 });
DoubtSchema.index({ acceptedBy: 1, status: 1 });

export default mongoose.model<IDoubt>('Doubt', DoubtSchema);
