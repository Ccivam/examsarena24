import express, { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Registration from '../models/Registration';
import Test from '../models/Test';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Create a Razorpay order for test registration
router.post('/create-order', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { testId } = req.body;

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    if (test.fee === 0) {
      return res.status(400).json({ message: 'This is a free test. No payment required.' });
    }

    if (new Date() > test.registrationDeadline) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // Check if already registered
    const existing = await Registration.findOne({ user: user._id, test: testId });
    if (existing && (existing.paymentStatus === 'verified' || existing.paymentStatus === 'pending')) {
      return res.status(400).json({ message: 'Already registered for this test' });
    }

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount: test.fee * 100,
      currency: 'INR',
      receipt: `jee_${testId}_${user._id}`,
      notes: {
        testId: testId.toString(),
        userId: user._id.toString(),
        testTitle: test.title,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      testTitle: test.title,
      userName: user.name,
      userEmail: user.email,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// Verify Razorpay payment and register user
router.post('/verify', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, testId } = req.body;

    // Cryptographically verify the payment came from Razorpay
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Guard against duplicate (e.g. double-click)
    const existing = await Registration.findOne({ user: user._id, test: testId });
    if (existing) {
      return res.status(400).json({ message: 'Already registered', registration: existing });
    }

    const registration = await Registration.create({
      user: user._id,
      test: testId,
      paymentStatus: 'verified',
      utrNumber: razorpay_payment_id,
      amount: test.fee,
      upiId: '',
      verifiedAt: new Date(),
    });

    res.json({ message: 'Payment verified. You are now registered!', registration });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Free test registration (no payment, no transaction needed - single doc creation is atomic)
router.post('/register-free', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { testId } = req.body;

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.fee !== 0) return res.status(400).json({ message: 'This test requires payment' });
    if (new Date() > test.registrationDeadline) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    const existing = await Registration.findOne({ user: user._id, test: testId });
    if (existing) {
      return res.status(400).json({ message: 'Already registered', registration: existing });
    }

    const registration = await Registration.create({
      user: user._id,
      test: testId,
      paymentStatus: 'free',
      amount: 0,
      verifiedAt: new Date(),
    });

    res.json({ message: 'Registered successfully!', registration });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Get my registration status for a test
router.get('/status/:testId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const registration = await Registration.findOne({ user: user._id, test: req.params.testId });
    if (!registration) return res.status(404).json({ message: 'Not registered' });
    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all registrations for a test
router.get('/test/:testId', isAdmin, async (req: Request, res: Response) => {
  try {
    const registrations = await Registration.find({ test: req.params.testId })
      .populate('user', 'name email picture')
      .sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
