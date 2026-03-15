import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.error('[Redis] Client error:', err));
client.on('connect', () => console.log('[Redis] Connected'));

export const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.warn('[Redis] REDIS_URL not set — Redis disabled, falling back to DB-only mode');
    return;
  }
  await client.connect();
};

export const isRedisReady = () => client.isReady;

// Key: submission:{userId}:{testId}  →  Hash field: {problemId}  →  value: selectedOption
export const redisKey = (userId: string, testId: string) => `submission:${userId}:${testId}`;

// Save one answer to Redis hash
export const saveAnswerToRedis = async (userId: string, testId: string, problemId: string, selectedOption: string) => {
  const key = redisKey(userId, testId);
  if (selectedOption) {
    await client.hSet(key, problemId, selectedOption);
  } else {
    await client.hDel(key, problemId);  // cleared answer
  }
  // Set TTL slightly beyond longest possible test (6 hours)
  await client.expire(key, 6 * 60 * 60);
};

// Get all answers for a submission from Redis
export const getAnswersFromRedis = async (userId: string, testId: string): Promise<Record<string, string>> => {
  const key = redisKey(userId, testId);
  return await client.hGetAll(key);
};

// Delete Redis key after flushing to DB
export const deleteSubmissionFromRedis = async (userId: string, testId: string) => {
  await client.del(redisKey(userId, testId));
};

export default client;
