import Test from '../models/Test';
import Submission from '../models/Submission';
import Registration from '../models/Registration';
import { sendExamStartEmail } from '../config/mailer';
import { flushRedisAnswers } from './flushRedisAnswers';
import { isRedisReady } from '../config/redis';

const checkAndUpdateTests = async () => {
  const now = new Date();

  // upcoming → live (start time reached)
  const toGoLive = await Test.find({
    status: 'upcoming',
    startTime: { $lte: now },
    endTime: { $gt: now },
  });

  for (const test of toGoLive) {
    test.status = 'live';
    await test.save();
    console.log(`[Scheduler] Test "${test.title}" is now LIVE`);

    // Send emails to all verified/free registrants
    const registrations = await Registration.find({
      test: test._id,
      paymentStatus: { $in: ['verified', 'free'] },
    }).populate('user', 'name email');

    for (const reg of registrations) {
      const user = reg.user as any;
      if (user?.email) {
        try {
          await sendExamStartEmail(user.email, user.name, test.title, test._id.toString(), test.endTime);
        } catch (e) {
          console.error(`Failed to send start email to ${user.email}:`, e);
        }
      }
    }
  }

  // live → completed (end time passed) — results are calculated manually by admin
  const toComplete = await Test.find({
    status: 'live',
    endTime: { $lte: now },
  });

  for (const test of toComplete) {
    test.status = 'completed';
    await test.save();
    console.log(`[Scheduler] Test "${test.title}" is now COMPLETED — admin should calculate results`);

    // Flush Redis answers for all active submissions of this test
    if (isRedisReady()) {
      const activeSubmissions = await Submission.find({ test: test._id, isSubmitted: false }).select('user');
      for (const sub of activeSubmissions) {
        try {
          await flushRedisAnswers(sub.user.toString(), test._id.toString(), true);
        } catch (e) {
          console.error(`[Scheduler] Failed to flush Redis for user ${sub.user} on test ${test._id}:`, e);
        }
      }
      console.log(`[Scheduler] Flushed Redis answers for ${activeSubmissions.length} active submission(s) on "${test.title}"`);
    }
  }
};

// Periodic checkpoint: flush Redis answers to DB every 5 minutes
const flushActiveAnswers = async () => {
  if (!isRedisReady()) return;
  const activeSubmissions = await Submission.find({ isSubmitted: false }).select('user test');
  for (const sub of activeSubmissions) {
    try {
      await flushRedisAnswers(sub.user.toString(), sub.test.toString(), false); // keep Redis key
    } catch (e) {
      console.error(`[Scheduler] Checkpoint flush failed for user ${sub.user}:`, e);
    }
  }
  if (activeSubmissions.length > 0) {
    console.log(`[Scheduler] Checkpoint: flushed Redis answers for ${activeSubmissions.length} active submission(s)`);
  }
};

export const startScheduler = () => {
  // Run immediately on startup, then every 30 seconds
  checkAndUpdateTests().catch(console.error);
  setInterval(() => checkAndUpdateTests().catch(console.error), 30_000);

  // Flush Redis answers to DB every 5 minutes as a safety checkpoint
  setInterval(() => flushActiveAnswers().catch(console.error), 5 * 60_000);

  console.log('[Scheduler] Test status scheduler started');
};
