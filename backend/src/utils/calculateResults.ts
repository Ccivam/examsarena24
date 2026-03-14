import Test from '../models/Test';
import Submission from '../models/Submission';
import Result from '../models/Result';

export const calculateResultsForTest = async (testId: string): Promise<number> => {
  const test = await Test.findById(testId).populate('problems.problem');
  if (!test) throw new Error('Test not found');

  // Auto-submit any submissions that weren't manually submitted before time ran out
  await Submission.updateMany(
    { test: test._id, isSubmitted: false },
    { isSubmitted: true, submittedAt: new Date() }
  );

  const submissions = await Submission.find({ test: test._id, isSubmitted: true });

  const results = [];
  for (const submission of submissions) {
    let physicsScore = 0;
    let chemistryScore = 0;
    let mathScore = 0;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    for (const testProblem of test.problems) {
      const problem = testProblem.problem as any;
      const answer = submission.answers.find(
        (a) => a.problem.toString() === problem._id.toString()
      );

      if (!answer || !answer.selectedOption) {
        unattempted++;
        continue;
      }

      const isNumerical = problem.problemType === 'numerical';
      let isCorrect = false;

      if (isNumerical) {
        const studentNum = parseFloat(answer.selectedOption);
        const tolerance = problem.answerTolerance ?? 0;
        isCorrect = !isNaN(studentNum) && Math.abs(studentNum - (problem.correctAnswer ?? 0)) <= tolerance;
      } else {
        isCorrect = answer.selectedOption === problem.correctOption;
      }

      if (isCorrect) {
        const pts = problem.marks || 4;
        if (problem.subject === 'Physics') physicsScore += pts;
        else if (problem.subject === 'Chemistry') chemistryScore += pts;
        else if (problem.subject === 'Mathematics') mathScore += pts;
        correct++;
      } else {
        // Numerical type: no negative marking (JEE style). MCQ: apply negativeMarks.
        const neg = isNumerical ? 0 : (problem.negativeMarks ?? 0);
        if (neg > 0) {
          if (problem.subject === 'Physics') physicsScore -= neg;
          else if (problem.subject === 'Chemistry') chemistryScore -= neg;
          else if (problem.subject === 'Mathematics') mathScore -= neg;
        }
        wrong++;
      }
    }

    const totalScore = physicsScore + chemistryScore + mathScore;
    results.push({
      user: submission.user,
      test: test._id,
      scores: { physics: physicsScore, chemistry: chemistryScore, mathematics: mathScore },
      totalScore,
      maxScore: test.problems.length * 4,
      correctAnswers: correct,
      wrongAnswers: wrong,
      unattempted,
      calculatedAt: new Date(),
      rank: 0,
      percentile: 0,
    });
  }

  // Sort by totalScore descending
  results.sort((a, b) => b.totalScore - a.totalScore);
  const totalParticipants = results.length;

  // Assign ranks: same score = same rank (standard competition ranking: 1,1,3,4...)
  let currentRank = 1;
  for (let i = 0; i < results.length; i++) {
    if (i > 0 && results[i].totalScore < results[i - 1].totalScore) {
      currentRank = i + 1; // skip ranks for ties
    }
    results[i].rank = currentRank;
    results[i].percentile = totalParticipants > 1
      ? Math.round(((totalParticipants - currentRank) / (totalParticipants - 1)) * 10000) / 100
      : 100;
  }

  // Upsert results — admin still needs to publish leaderboard/solutions separately
  for (const result of results) {
    await Result.findOneAndUpdate(
      { user: result.user, test: result.test },
      result,
      { upsert: true, new: true }
    );
  }

  // Mark test as completed (but do NOT publish leaderboard/solutions yet)
  await Test.findByIdAndUpdate(test._id, { status: 'completed' });

  return results.length;
};
