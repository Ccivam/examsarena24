import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const isDev = !process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_gmail@gmail.com';

const send = async (to: string, subject: string, html: string) => {
  if (isDev) {
    console.log(`\n📧 [DEV EMAIL] To: ${to} | Subject: ${subject}\n`);
    return;
  }
  await transporter.sendMail({ from: process.env.EMAIL_FROM || 'JEE Arena <noreply@jeearena.com>', to, subject, html });
};

export const sendOtpEmail = async (to: string, otp: string, purpose: 'register' | 'reset-password') => {
  const subject = purpose === 'register' ? 'Verify your JEE Arena account' : 'Reset your JEE Arena password';
  const action = purpose === 'register' ? 'verify your email' : 'reset your password';

  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; border: 1px solid #e0dcd0;">
      <h2 style="font-family: Georgia, serif; font-weight: 400; margin-bottom: 1rem;">JEE Arena</h2>
      <p style="color: #4a4840; margin-bottom: 1.5rem;">Use the OTP below to ${action}. It expires in <strong>10 minutes</strong>.</p>
      <div style="background: #f2f0e6; border: 1px solid #e0dcd0; padding: 1.5rem; text-align: center; margin-bottom: 1.5rem;">
        <span style="font-family: monospace; font-size: 2.5rem; letter-spacing: 0.4em; font-weight: 700; color: #0a0a0a;">${otp}</span>
      </div>
      <p style="font-size: 0.8rem; color: #4a4840;">Do not share this OTP with anyone. JEE Arena will never ask for your OTP.</p>
    </div>
  `;

  if (isDev) console.log(`\n📧 OTP for ${to} (${purpose}): ${otp}\n`);
  else await send(to, subject, html);
};

export const sendExamStartEmail = async (
  to: string, name: string, testTitle: string, testId: string, endTime: Date
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const endsAt = endTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:480px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:0.5rem;">JEE Arena</h2>
      <div style="background:#39ff14;padding:0.25rem 0.5rem;display:inline-block;font-style:italic;font-family:Georgia,serif;margin-bottom:1.5rem;">Live Now</div>
      <p style="color:#0a0a0a;font-size:1rem;margin-bottom:0.75rem;">Hi ${name},</p>
      <p style="color:#4a4840;margin-bottom:1.5rem;">Your exam <strong>${testTitle}</strong> has started! You can enter now. The exam closes at <strong>${endsAt} IST</strong>.</p>
      <a href="${frontendUrl}/test/${testId}/room"
        style="display:inline-block;padding:12px 28px;background:#39ff14;border:1px solid #0a0a0a;color:#0a0a0a;font-family:'Inter',sans-serif;font-weight:600;text-decoration:none;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;">
        Enter Exam Now →
      </a>
      <p style="margin-top:1.5rem;font-size:0.8rem;color:#4a4840;">Do not refresh or close the exam tab once you start. Your answers are auto-saved.</p>
    </div>`;

  if (isDev) console.log(`\n📧 [EXAM START] To: ${to} | Test: ${testTitle}\n`);
  else await send(to, `Your exam "${testTitle}" has started!`, html);
};

export const sendExamEndEmail = async (to: string, name: string, testTitle: string) => {
  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:480px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:1rem;">JEE Arena</h2>
      <p style="color:#0a0a0a;margin-bottom:0.75rem;">Hi ${name},</p>
      <p style="color:#4a4840;margin-bottom:1rem;">The exam <strong>${testTitle}</strong> has ended. Results and solutions will be published shortly.</p>
      <p style="font-size:0.8rem;color:#4a4840;">Check the Past Competitions section to view your performance once results are out.</p>
    </div>`;

  if (isDev) console.log(`\n📧 [EXAM END] To: ${to} | Test: ${testTitle}\n`);
  else await send(to, `Exam "${testTitle}" has ended — results coming soon`, html);
};

export const sendNewTestNotification = async (
  to: string, name: string,
  test: { title: string; _id: string; startTime: Date; fee: number; type: string }
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://examarena24.in';
  const start = test.startTime.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const fee = test.fee > 0 ? `₹${test.fee}` : 'Free';
  const type = test.type.replace(/_/g, ' ');

  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:0.5rem;">JEE Arena</h2>
      <div style="background:#39ff14;padding:0.25rem 0.6rem;display:inline-block;font-style:italic;font-family:Georgia,serif;margin-bottom:1.5rem;font-size:0.85rem;">New Test Announced</div>
      <p style="color:#0a0a0a;margin-bottom:0.75rem;">Hi ${name},</p>
      <p style="color:#4a4840;margin-bottom:1.5rem;">A new exam has been scheduled on JEE Arena. Register early to secure your spot!</p>
      <div style="border:1px solid #e0dcd0;padding:1.25rem;margin-bottom:1.5rem;background:#f2f0e6;">
        <h3 style="font-family:Georgia,serif;font-weight:400;margin:0 0 0.75rem;">${test.title}</h3>
        <table style="font-size:0.85rem;color:#4a4840;border-collapse:collapse;width:100%;">
          <tr><td style="padding:3px 0;width:100px;">Type</td><td style="color:#0a0a0a;font-weight:500;">${type}</td></tr>
          <tr><td style="padding:3px 0;">Starts</td><td style="color:#0a0a0a;font-weight:500;">${start} IST</td></tr>
          <tr><td style="padding:3px 0;">Entry Fee</td><td style="color:#0a0a0a;font-weight:500;">${fee}</td></tr>
        </table>
      </div>
      <a href="${frontendUrl}/test/${test._id}"
        style="display:inline-block;padding:12px 28px;background:#39ff14;border:1px solid #0a0a0a;color:#0a0a0a;font-family:'Inter',sans-serif;font-weight:600;text-decoration:none;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;">
        View & Register →
      </a>
      <p style="margin-top:1.5rem;font-size:0.75rem;color:#9a9690;">You received this because you are registered on JEE Arena.</p>
    </div>`;

  if (isDev) console.log(`\n📧 [NEW TEST] To: ${to} | Test: ${test.title}\n`);
  else await send(to, `New Exam: ${test.title} — Register Now`, html);
};

export const sendAnnouncementNotification = async (
  to: string, name: string,
  discussion: { title: string; _id: string; type: string }
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://examarena24.in';
  const typeLabel = discussion.type === 'editorial' ? 'Editorial' : discussion.type === 'announcement' ? 'Announcement' : 'Discussion';

  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:0.5rem;">JEE Arena</h2>
      <div style="background:#f2f0e6;border:1px solid #e0dcd0;padding:0.25rem 0.6rem;display:inline-block;font-style:italic;font-family:Georgia,serif;margin-bottom:1.5rem;font-size:0.85rem;">${typeLabel}</div>
      <p style="color:#0a0a0a;margin-bottom:0.75rem;">Hi ${name},</p>
      <p style="color:#4a4840;margin-bottom:1.5rem;">A new ${typeLabel.toLowerCase()} has been posted on JEE Arena:</p>
      <div style="border-left:3px solid #0a0a0a;padding:0.75rem 1rem;margin-bottom:1.5rem;background:#f2f0e6;">
        <strong style="font-size:1rem;">${discussion.title}</strong>
      </div>
      <a href="${frontendUrl}/discussions/${discussion._id}"
        style="display:inline-block;padding:12px 28px;background:#0a0a0a;border:1px solid #0a0a0a;color:#fcfbf6;font-family:'Inter',sans-serif;font-weight:600;text-decoration:none;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;">
        Read Now →
      </a>
      <p style="margin-top:1.5rem;font-size:0.75rem;color:#9a9690;">You received this because you are registered on JEE Arena.</p>
    </div>`;

  if (isDev) console.log(`\n📧 [ANNOUNCEMENT] To: ${to} | Title: ${discussion.title}\n`);
  else await send(to, `[JEE Arena] ${discussion.title}`, html);
};

export const sendCommentNotification = async (
  to: string, toName: string,
  commenterName: string,
  discussion: { title: string; _id: string }
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://examarena24.in';
  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:1rem;">JEE Arena</h2>
      <p style="color:#0a0a0a;margin-bottom:0.75rem;">Hi ${toName},</p>
      <p style="color:#4a4840;margin-bottom:1rem;"><strong>${commenterName}</strong> commented on your discussion:</p>
      <div style="border-left:3px solid #39ff14;padding:0.75rem 1rem;margin-bottom:1.5rem;background:#f2f0e6;">
        <strong>${discussion.title}</strong>
      </div>
      <a href="${frontendUrl}/discussions/${discussion._id}"
        style="display:inline-block;padding:12px 28px;background:#0a0a0a;color:#fcfbf6;font-family:'Inter',sans-serif;font-weight:600;text-decoration:none;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;">
        View Discussion →
      </a>
    </div>`;
  if (isDev) console.log(`\n📧 [COMMENT] To: ${to} | By: ${commenterName}\n`);
  else await send(to, `${commenterName} commented on your discussion`, html);
};

export const sendMentionNotification = async (
  to: string, toName: string,
  mentionerName: string,
  discussion: { title: string; _id: string }
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://examarena24.in';
  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:1rem;">JEE Arena</h2>
      <p style="color:#0a0a0a;margin-bottom:0.75rem;">Hi ${toName},</p>
      <p style="color:#4a4840;margin-bottom:1rem;"><strong>${mentionerName}</strong> mentioned you in a discussion:</p>
      <div style="border-left:3px solid #39ff14;padding:0.75rem 1rem;margin-bottom:1.5rem;background:#f2f0e6;">
        <strong>${discussion.title}</strong>
      </div>
      <a href="${frontendUrl}/discussions/${discussion._id}"
        style="display:inline-block;padding:12px 28px;background:#0a0a0a;color:#fcfbf6;font-family:'Inter',sans-serif;font-weight:600;text-decoration:none;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;">
        View Discussion →
      </a>
    </div>`;
  if (isDev) console.log(`\n📧 [MENTION] To: ${to} | By: ${mentionerName}\n`);
  else await send(to, `${mentionerName} mentioned you in a discussion`, html);
};

export const sendLeaderboardPublishedEmail = async (
  to: string, name: string, test: { title: string; _id: string }
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://examarena24.in';
  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:0.5rem;">JEE Arena</h2>
      <div style="background:#39ff14;padding:0.25rem 0.6rem;display:inline-block;font-style:italic;font-family:Georgia,serif;margin-bottom:1.5rem;font-size:0.85rem;">Results Published</div>
      <p style="color:#0a0a0a;margin-bottom:0.75rem;">Hi ${name},</p>
      <p style="color:#4a4840;margin-bottom:1.5rem;">The leaderboard for <strong>${test.title}</strong> has been published. Check your rank and see how you performed!</p>
      <a href="${frontendUrl}/leaderboard/test/${test._id}"
        style="display:inline-block;padding:12px 28px;background:#39ff14;border:1px solid #0a0a0a;color:#0a0a0a;font-family:'Inter',sans-serif;font-weight:600;text-decoration:none;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;">
        View Leaderboard →
      </a>
      <p style="margin-top:1.5rem;font-size:0.75rem;color:#9a9690;">You received this because you registered for this exam on JEE Arena.</p>
    </div>`;
  if (isDev) console.log(`\n📧 [LEADERBOARD] To: ${to} | Test: ${test.title}\n`);
  else await send(to, `Leaderboard published: ${test.title}`, html);
};

export const sendReplyNotification = async (
  to: string, toName: string,
  replierName: string,
  discussion: { title: string; _id: string }
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://examarena24.in';
  const html = `
    <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e0dcd0;">
      <h2 style="font-family:Georgia,serif;font-weight:400;margin-bottom:1rem;">JEE Arena</h2>
      <p style="color:#0a0a0a;margin-bottom:0.75rem;">Hi ${toName},</p>
      <p style="color:#4a4840;margin-bottom:1rem;"><strong>${replierName}</strong> replied to your comment in:</p>
      <div style="border-left:3px solid #39ff14;padding:0.75rem 1rem;margin-bottom:1.5rem;background:#f2f0e6;">
        <strong>${discussion.title}</strong>
      </div>
      <a href="${frontendUrl}/discussions/${discussion._id}"
        style="display:inline-block;padding:12px 28px;background:#0a0a0a;color:#fcfbf6;font-family:'Inter',sans-serif;font-weight:600;text-decoration:none;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;">
        View Reply →
      </a>
    </div>`;
  if (isDev) console.log(`\n📧 [REPLY] To: ${to} | By: ${replierName}\n`);
  else await send(to, `${replierName} replied to your comment`, html);
};
