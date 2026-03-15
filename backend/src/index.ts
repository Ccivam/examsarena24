import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import path from 'path';
import MongoStore from 'connect-mongo';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
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
import discussionRoutes from './routes/discussions';

const app = express();
const PORT = parseInt(process.env.PORT || '5000');

// Trust Railway's reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

// Connect to MongoDB and start scheduler
connectDB().then(() => startScheduler());
connectRedis().catch(console.error);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 100,            // 100 requests per IP per 10s
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 auth attempts per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again after a minute.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/email', authLimiter);

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

// Session store — Redis if available, fallback to MongoDB
const sessionStore = process.env.REDIS_URL
  ? (() => {
      const redisSessionClient = createClient({ url: process.env.REDIS_URL });
      redisSessionClient.connect().catch(console.error);
      return new RedisStore({ client: redisSessionClient, prefix: 'sess:' });
    })()
  : MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/jeearena',
    });

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
app.use('/api/discussions', discussionRoutes);

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

// Serve React frontend in production (same-domain, no CORS issues)
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`JEE Arena backend running on http://localhost:${PORT}`);
});

export default app;
