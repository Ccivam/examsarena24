import express, { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import User, { IUser } from '../models/User';

const router = express.Router();

// Configure passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());
          const email = profile.emails?.[0]?.value || undefined;
          const role = email && adminEmails.includes(email) ? 'admin' : 'student';

          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value || '',
            role,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  const id = (user as IUser)._id;
  console.log('[Passport] serializeUser id:', id);
  done(null, id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    console.log('[Passport] deserializeUser id:', id);
    const user = await User.findById(id);
    console.log('[Passport] deserializeUser found user:', user ? user.email : 'null');
    done(null, user);
  } catch (error) {
    console.error('[Passport] deserializeUser error:', error);
    done(error);
  }
});

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  (req: Request, res: Response) => {
    req.session.save((err) => {
      if (err) console.error('Session save error after OAuth:', err);
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    });
  }
);

// Get current user
router.get('/me', (req: Request, res: Response) => {
  console.log('[/me] sessionID:', req.sessionID, 'isAuthenticated:', req.isAuthenticated(), 'session.passport:', (req.session as any).passport);
  if (req.isAuthenticated()) {
    const user = req.user as IUser;
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email || null,
      picture: user.picture,
      role: user.role,
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;
