
import React from 'react';
import { WeightEntry } from '../../types';

interface WeightStatsProps {
  entries: WeightEntry[];
}

const WeightStats: React.FC<WeightStatsProps> = ({ entries }) => {
  if (entries.length === 0) return null;

  const currentWeight = entries[entries.length - 1].weight;
  const startingWeight = entries[0].weight;
  const weightChange = currentWeight - startingWeight;

  const weights = entries.map(e => e.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const avgWeight = entries.reduce((sum, e) => sum + e.weight, 0) / entries.length;

  const formatStat = (value: number) => value.toFixed(1);

  return (
    <div className="bg-card p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-textPrimary mb-3">Statistics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
        <StatCard label="Current" value={formatStat(currentWeight)} unit="kg/lbs" />
        <StatCard label="Change" value={`${weightChange > 0 ? '+' : ''}${formatStat(weightChange)}`} unit="kg/lbs" highlight={true} positive={weightChange <= 0} />
        <StatCard label="Average" value={formatStat(avgWeight)} unit="kg/lbs" />
        <StatCard label="Min" value={formatStat(minWeight)} unit="kg/lbs" />
        <StatCard label="Max" value={formatStat(maxWeight)} unit="kg/lbs" />
        <StatCard label="Entries" value={entries.length.toString()} unit="" />
      </div>
    </div>
  );
};

interface StatCardProps {
    label: string;
    value: string;
    unit: string;
    highlight?: boolean;
    positive?: boolean; // For 'Change' stat, true if change is good (e.g. weight loss)
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, highlight, positive }) => {
    let valueColor = 'text-primary';
    if (highlight) {
        valueColor = positive ? 'text-green-500' : 'text-red-500';
    }

    return (
        <div className="bg-background dark:bg-gray-700 p-3 rounded-md">
            <p className="text-sm text-textSecondary">{label}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
            {unit && <p className="text-xs text-textSecondary">{unit}</p>}
        </div>
    );
}


export default WeightStats;
