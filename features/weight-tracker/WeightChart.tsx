
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WeightEntry } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';


interface WeightChartProps {
  entries: WeightEntry[];
}

const WeightChart: React.FC<WeightChartProps> = ({ entries }) => {
  const { theme } = useTheme();
  const chartData = entries.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-CA'), // Short date format for X-axis
    weight: entry.weight,
  }));

  if (entries.length < 2) {
    return <p className="text-textSecondary text-center py-4">Not enough data to display a chart. Add at least two entries.</p>;
  }
  
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary-color').trim();


  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{
            top: 5, right: 30, left: 0, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4b5563' : '#d1d5db'}/>
          <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 12 }} />
          <YAxis tick={{ fill: textColor, fontSize: 12 }} domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip 
            contentStyle={{ backgroundColor: theme === 'dark' ? '#374151' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`}}
            labelStyle={{ color: textColor }}
            itemStyle={{ color: primaryColor }}
          />
          <Legend wrapperStyle={{ color: textColor}} />
          <Line type="monotone" dataKey="weight" stroke={primaryColor} strokeWidth={2} activeDot={{ r: 6 }} dot={{fill: primaryColor, r:3}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeightChart;
