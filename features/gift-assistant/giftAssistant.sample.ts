
import { GiftRecipientList, GiftItemStatus } from '../../types';
import { NEW_TAG_DURATION_MS } from './giftAssistant.data'; // Use the one from .data for consistency

const today = new Date();
const daysAgo = (days: number): string => {
    const date = new Date(today);
    date.setDate(today.getDate() - days);
    return date.toISOString();
};

export const sampleGiftRecipientLists: GiftRecipientList[] = [
  {
    id: 'grl1',
    personName: 'Alice (Wife)',
    knowledge: 'Loves gardening, reading fantasy novels (Brandon Sanderson fan), and enjoys quiet evenings with tea. Collects unique mugs. Favorite color is green. Dislikes clutter.',
    gifts: [
      { id: 'g1a', itemName: 'Limited Edition "Stormlight Archive" Mug', details: 'From Dragonsteel Books', status: GiftItemStatus.Purchased, dateAdded: daysAgo(5), tags: ['book-merch', 'collectible'] },
      { id: 'g1b', itemName: 'New Pruning Shears', details: 'High quality, ergonomic grip', status: GiftItemStatus.Wrapped, dateAdded: daysAgo(10), tags: ['gardening', 'practical'] },
      { id: 'g1c', itemName: 'Subscription to "Tea of the Month" Club', status: GiftItemStatus.Idea, dateAdded: daysAgo(2), tags: ['subscription', 'consumable'] },
      { id: 'g1d', itemName: 'Kindle Oasis', details: 'Waterproof, for reading in the bath', status: GiftItemStatus.Considered, dateAdded: daysAgo(30), tags: ['tech', 'reading'] },
    ],
    orderIndex: 0,
  },
  {
    id: 'grl2',
    personName: 'Bob (Dad)',
    knowledge: 'Enjoys DIY projects, fishing, and history documentaries. Always needs new tools. Supports Manchester United. Size XL for shirts.',
    gifts: [
      { id: 'g2a', itemName: 'Cordless Drill Set', status: GiftItemStatus.Gifted, dateAdded: daysAgo(100), tags: ['tools', 'diy'] },
      { id: 'g2b', itemName: 'Book on WWII History', details: 'Specifically about the Pacific theater', status: GiftItemStatus.Idea, dateAdded: daysAgo(15), tags: ['book', 'history'] },
      { id: 'g2c', itemName: 'New Fishing Lure Set', status: GiftItemStatus.Considered, dateAdded: daysAgo(5), tags: ['fishing', 'hobby'] },
    ],
    orderIndex: 1,
  },
  {
    id: 'grl3',
    personName: 'Charlie (Son, 10yo)',
    knowledge: 'Loves LEGO, Minecraft, and space. Wants a new bike. Favorite animal is a T-Rex.',
    gifts: [
      { id: 'g3a', itemName: 'LEGO Space Shuttle Set', status: GiftItemStatus.Purchased, dateAdded: daysAgo(8), tags: ['lego', 'space', 'toy'] },
      { id: 'g3b', itemName: 'Minecraft Dungeons Game', status: GiftItemStatus.Wrapped, dateAdded: daysAgo(12), tags: ['game', 'minecraft'] },
      { id: 'g3c', itemName: 'Dinosaur Encyclopedia', status: GiftItemStatus.Idea, dateAdded: daysAgo(1), tags: ['book', 'dinosaur'] },
      { id: 'g3d', itemName: 'New Bicycle (BMX style)', status: GiftItemStatus.Considered, dateAdded: daysAgo(45), isNew: true, dateNewClearTimestamp: Date.now() + NEW_TAG_DURATION_MS, tags: ['outdoor', 'sport'] },
      { id: 'g3e', itemName: 'Telescope for Beginners', status: GiftItemStatus.Idea, dateAdded: daysAgo(3), tags: ['science', 'space', 'educational'] },
    ],
    orderIndex: 2,
  },
  {
    id: 'grl4',
    personName: 'Diana (Friend from Work)',
    knowledge: 'Office Secret Santa. Budget $20. Likes coffee, cats, and travel.',
    gifts: [
      { id: 'g4a', itemName: 'Funny Cat Mug', status: GiftItemStatus.Idea, dateAdded: daysAgo(1), tags: ['mug', 'cat', 'funny'] },
      { id: 'g4b', itemName: 'Gourmet Coffee Beans', status: GiftItemStatus.Idea, dateAdded: daysAgo(1), tags: ['coffee', 'consumable'] },
    ],
    orderIndex: 3,
  },
  {
    id: 'grl5',
    personName: 'Edward (Brother - difficult to buy for)',
    knowledge: 'Minimalist. Appreciates experiences over things. Likes good food and whiskey.',
    gifts: [
       { id: 'g5a', itemName: 'Whiskey Tasting Set', details: 'Small batch, local distillery', status: GiftItemStatus.Considered, dateAdded: daysAgo(60), tags:['alcohol', 'experience', 'consumable'] },
       { id: 'g5b', itemName: 'Gift certificate to his favorite restaurant', status: GiftItemStatus.Idea, dateAdded: daysAgo(5) }
    ],
    orderIndex: 4,
  },
  {
    id: 'grl6_empty',
    personName: 'Fiona (Niece - Toddler)',
    knowledge: 'Age 2. Likes bright colors, soft toys, and making noise.',
    gifts: [], 
    orderIndex: 5,
  }
];
