import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  googleId?: string;
  email?: string;
  password?: string;
  name: string;
  picture: string;
  role: 'student' | 'admin' | 'contributor';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: { type: String, sparse: true, unique: true },
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    name: { type: String, required: true },
    picture: { type: String, default: '' },
    role: { type: String, enum: ['student', 'admin', 'contributor'], default: 'student' },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password || '');
};

export default mongoose.model<IUser>('User', UserSchema);
