import mongoose from 'mongoose';
import Submission from '../models/Submission';
import { getAnswersFromRedis, deleteSubmissionFromRedis, isRedisReady } from '../config/redis';

/**
 * Reads answers from Redis for a given user+test and writes them into MongoDB.
 * If Redis is not available, this is a no-op (DB already has the answers).
 * Pass deleteAfter=true to clean up the Redis key once flushed.
 */
export const flushRedisAnswers = async (
  userId: string,
  testId: string,
  deleteAfter = false,
) => {
  if (!isRedisReady()) return;

  const answers = await getAnswersFromRedis(userId, testId);
  if (Object.keys(answers).length === 0) return;

  const submission = await Submission.findOne({ user: userId, test: testId });
  if (!submission || submission.isSubmitted) return;

  for (const [problemId, selectedOption] of Object.entries(answers)) {
    const idx = submission.answers.findIndex(a => a.problem.toString() === problemId);
    if (idx >= 0) {
      submission.answers[idx].selectedOption = selectedOption;
      submission.answers[idx].submittedAt = new Date();
    } else {
      submission.answers.push({
        problem: new mongoose.Types.ObjectId(problemId),
        selectedOption,
        submittedAt: new Date(),
      });
    }
  }

  await submission.save();

  if (deleteAfter) {
    await deleteSubmissionFromRedis(userId, testId);
  }
};
