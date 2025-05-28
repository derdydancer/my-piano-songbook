
import { DisneyOwnedStatus } from '../../types';
import { DISNEY_ANIMATED_CLASSICS } from './disneyCollection.constants';

export const sampleDisneyCollection: DisneyOwnedStatus[] = DISNEY_ANIMATED_CLASSICS.map((classic, index) => {
  const owned: DisneyOwnedStatus = { classicId: classic.id, ownedDvd: false, ownedBluRay: false };
  if (index % 5 === 0) owned.ownedDvd = true; 
  if (index % 3 === 0) owned.ownedBluRay = true; 
  if (index === 1 || index === 10 || index === 25) { 
    owned.ownedDvd = true;
    owned.ownedBluRay = true;
  }
  if (classic.title === "The Lion King") owned.ownedBluRay = true;
  if (classic.title === "Aladdin") owned.ownedDvd = true;
  return owned;
});

// Ensure Zootopia is unowned for testing filters
const zootopiaEntry = sampleDisneyCollection.find(c => {
    const zootopiaClassic = DISNEY_ANIMATED_CLASSICS.find(dc => dc.title === "Zootopia");
    return zootopiaClassic && c.classicId === zootopiaClassic.id;
});
if (zootopiaEntry) { 
  zootopiaEntry.ownedBluRay = false; 
  zootopiaEntry.ownedDvd = false; 
}
