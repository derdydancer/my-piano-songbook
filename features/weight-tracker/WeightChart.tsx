
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
    timestamp: new Date(entry.date).getTime(), // Convert date to timestamp for time scale
    weight: entry.weight,
  }));

  if (entries.length < 2) {
    return <p className="text-textSecondary text-center py-4">Not enough data to display a chart. Add at least two entries.</p>;
  }
  
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary-color').trim();

  const dateFormatter = (time: number) => {
    return new Date(time).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' });
  };

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
          <XAxis 
            dataKey="timestamp" 
            type="number"
            scale="time"
            domain={['auto', 'auto']}
            tickFormatter={dateFormatter}
            tick={{ fill: textColor, fontSize: 12 }} 
            name="Date"
          />
          <YAxis 
            tick={{ fill: textColor, fontSize: 12 }} 
            domain={['dataMin - 2', 'dataMax + 2']} 
            name="Weight"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: theme === 'dark' ? '#374151' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`}}
            labelStyle={{ color: textColor }}
            itemStyle={{ color: primaryColor }}
            labelFormatter={dateFormatter} // Format the tooltip label as well
          />
          <Legend wrapperStyle={{ color: textColor}} />
          <Line 
            type="monotone" 
            dataKey="weight" 
            stroke={primaryColor} 
            strokeWidth={2} 
            activeDot={{ r: 6 }} 
            dot={{fill: primaryColor, r:3, strokeWidth: 1, stroke: primaryColor}} 
            name="Weight"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeightChart;
