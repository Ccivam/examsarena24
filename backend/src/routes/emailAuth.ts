import express, { Request, Response } from 'express';
import User from '../models/User';
import OtpCode from '../models/OtpCode';
import { sendOtpEmail } from '../config/mailer';

const router = express.Router();

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// ── REGISTER: Step 1 — send OTP to email ────────────────────────────────────
// POST /api/auth/email/send-otp  { name, email, password }
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      // If they used Google, let them know
      if (existing.googleId && !existing.password) {
        return res.status(400).json({ message: 'This email is linked to a Google account. Sign in with Google instead.' });
      }
      return res.status(400).json({ message: 'An account with this email already exists. Please sign in.' });
    }

    // Rate-limit: one OTP per email per minute
    const recent = await OtpCode.findOne({ identifier: email.toLowerCase().trim(), purpose: 'register' });
    if (recent) {
      const ageMs = Date.now() - (recent.expiresAt.getTime() - 10 * 60 * 1000);
      if (ageMs < 60_000) {
        return res.status(429).json({ message: 'Please wait a minute before requesting another OTP' });
      }
    }

    const otp = generateOtp();
    await OtpCode.deleteMany({ identifier: email.toLowerCase().trim(), purpose: 'register' });
    await OtpCode.create({
      identifier: email.toLowerCase().trim(),
      code: otp,
      purpose: 'register',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(email, otp, 'register');
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Check email config.' });
  }
});

// ── REGISTER: Step 2 — verify OTP and create account ────────────────────────
// POST /api/auth/email/verify-otp  { name, email, password, otp }
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!email || !otp || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const record = await OtpCode.findOne({ identifier: email.toLowerCase().trim(), purpose: 'register' });
    if (!record) return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    if (record.code !== String(otp).trim()) return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    if (new Date() > record.expiresAt) {
      await OtpCode.deleteMany({ identifier: email.toLowerCase().trim(), purpose: 'register' });
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Cleanup OTP
    await OtpCode.deleteMany({ identifier: email.toLowerCase().trim(), purpose: 'register' });

    // Check admin
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    const role = adminEmails.includes(email.toLowerCase().trim()) ? 'admin' : 'student';

    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), password, role, emailVerified: true });
    await user.save();

    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Account created but login failed. Please sign in.' });
      res.status(201).json({ _id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role });
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// ── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/email/login  { email, password }
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'No account found with this email' });

    if (!user.password) {
      return res.status(401).json({ message: 'This account uses Google sign-in. Please sign in with Google.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Incorrect password' });

    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Login failed' });
      res.json({ _id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role });
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// ── FORGOT PASSWORD: Step 1 — send reset OTP ────────────────────────────────
// POST /api/auth/email/forgot-password  { email }
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Don't reveal whether account exists — always say "if found"
    if (!user || !user.password) {
      // Still return 200 for security, but skip sending
      return res.json({ message: 'If an account with that email exists, an OTP has been sent.' });
    }

    const otp = generateOtp();
    await OtpCode.deleteMany({ identifier: email.toLowerCase().trim(), purpose: 'reset-password' });
    await OtpCode.create({
      identifier: email.toLowerCase().trim(),
      code: otp,
      purpose: 'reset-password',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(email, otp, 'reset-password');
    res.json({ message: 'If an account with that email exists, an OTP has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send reset OTP' });
  }
});

// ── FORGOT PASSWORD: Step 2 — verify OTP and set new password ───────────────
// POST /api/auth/email/reset-password  { email, otp, newPassword }
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const record = await OtpCode.findOne({ identifier: email.toLowerCase().trim(), purpose: 'reset-password' });
    if (!record) return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    if (record.code !== String(otp).trim()) return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    if (new Date() > record.expiresAt) {
      await OtpCode.deleteMany({ identifier: email.toLowerCase().trim(), purpose: 'reset-password' });
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    await OtpCode.deleteMany({ identifier: email.toLowerCase().trim(), purpose: 'reset-password' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'Account not found' });

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ message: 'Password updated successfully. Please sign in with your new password.' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed' });
  }
});

export default router;
