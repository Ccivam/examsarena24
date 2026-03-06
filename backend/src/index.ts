import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import path from 'path';
import MongoStore from 'connect-mongo';
import { connectDB } from './config/db';
import { startScheduler } from './utils/scheduler';

// Routes
import authRoutes from './routes/auth';
import emailAuthRoutes from './routes/emailAuth';
import testRoutes from './routes/tests';
import problemRoutes from './routes/problems';
import userRoutes from './routes/users';
import leaderboardRoutes from './routes/leaderboard';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';

const app = express();
const PORT = parseInt(process.env.PORT || '5000');

// Connect to MongoDB and start scheduler
connectDB().then(() => startScheduler());

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (QR images etc.)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/jeearena',
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/email', emailAuthRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve payment QR image
app.get('/api/qr-image', (_, res) => {
  const extensions = ['png', 'jpg', 'jpeg', 'webp'];
  const fs = require('fs');
  for (const ext of extensions) {
    const filePath = path.join(__dirname, '../public/qr', `payment-qr.${ext}`);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  res.status(404).json({ message: 'QR image not found' });
});

app.listen(PORT, () => {
  console.log(`JEE Arena backend running on http://localhost:${PORT}`);
});

export default app;
