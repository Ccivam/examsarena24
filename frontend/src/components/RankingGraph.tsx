import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Result } from '../types';

interface Props {
  results: Result[];
}

const RankingGraph: React.FC<Props> = ({ results }) => {
  const data = [...results]
    .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
    .map((r) => ({
      name: typeof r.test === 'object' ? r.test.title.slice(0, 20) + '...' : 'Test',
      rank: r.rank,
      score: Math.round((r.totalScore / r.maxScore) * 100),
    }));

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        No test results yet.
      </div>
    );
  }

  return (
    <div className="ranking-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fontFamily: 'var(--f-sans)' }}
            tickLine={false}
          />
          <YAxis
            reversed
            tick={{ fontSize: 11, fontFamily: 'var(--f-sans)' }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Rank', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--c-paper)',
              border: '1px solid var(--c-border)',
              fontFamily: 'var(--f-sans)',
              fontSize: '0.8rem',
            }}
          />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="var(--c-ink)"
            strokeWidth={2}
            dot={{ fill: 'var(--c-accent)', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RankingGraph;
