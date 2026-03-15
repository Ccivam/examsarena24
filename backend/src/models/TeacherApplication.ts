import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacherApplication extends Document {
  user: mongoose.Types.ObjectId;
  motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
}

const TeacherApplicationSchema = new Schema<ITeacherApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    motivation: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ITeacherApplication>('TeacherApplication', TeacherApplicationSchema);
