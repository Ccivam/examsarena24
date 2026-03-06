import Test from '../models/Test';
import Registration from '../models/Registration';
import { sendExamStartEmail } from '../config/mailer';

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
  }
};

export const startScheduler = () => {
  // Run immediately on startup, then every 30 seconds
  checkAndUpdateTests().catch(console.error);
  setInterval(() => checkAndUpdateTests().catch(console.error), 30_000);
  console.log('[Scheduler] Test status scheduler started');
};
