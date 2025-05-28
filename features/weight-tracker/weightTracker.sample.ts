
import { WeightEntry } from '../../types';

const today = new Date();
const daysAgo = (days: number): string => {
    const date = new Date(today);
    date.setDate(today.getDate() - days);
    return date.toISOString();
};

export const sampleWeightEntries: WeightEntry[] = [
  { id: 'w1', date: daysAgo(90), weight: 85, notes: 'Starting point. Feeling motivated!' },
  { id: 'w2', date: daysAgo(83), weight: 84.5, notes: 'First week, small drop.' },
  { id: 'w3', date: daysAgo(76), weight: 84, notes: '' },
  { id: 'w4', date: daysAgo(69), weight: 83, notes: 'Good progress.' },
  { id: 'w5', date: daysAgo(62), weight: 83.2, notes: 'Slight increase, holiday weekend.' },
  { id: 'w6', date: daysAgo(55), weight: 82.5 },
  { id: 'w7', date: daysAgo(48), weight: 81.8, notes: 'Feeling good, sticking to the plan.' },
  { id: 'w8', date: daysAgo(41), weight: 81.5, notes: 'Plateauing a bit.' },
  { id: 'w9', date: daysAgo(34), weight: 81.6 },
  { id: 'w10', date: daysAgo(27), weight: 80.5, notes: 'Breakthrough! New low.' },
  { id: 'w11', date: daysAgo(20), weight: 80.2, notes: 'Consistent.' },
  { id: 'w12', date: daysAgo(13), weight: 79.8, notes: 'Under 80!' },
  { id: 'w13', date: daysAgo(6), weight: 79.5, notes: 'Maintaining well.' },
  { id: 'w14', date: daysAgo(2), weight: 80.1, notes: 'A bit of a bloat day, probably water weight. Ate a lot of salty food yesterday and didn\'t sleep well. Hopefully it normalizes soon. Still on track overall.' },
  { id: 'w15', date: daysAgo(0), weight: 79.2, notes: 'Back on track! Lowest yet.' },
];
