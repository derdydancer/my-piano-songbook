
import { AppData, GiftRecipientList, GiftItem, ManualGiftItemData, GiftItemStatus, SinglePersonGiftSuggestion, AISuggestedGiftItem, ProcessedAIResults } from '../../types';

export const NEW_TAG_DURATION_MS = 5 * 60 * 1000; // 5 minutes, used by AI processing actions

export const initialGiftAssistantData = {
  giftRecipientLists: [] as GiftRecipientList[],
};

export type GiftAssistantActions = ReturnType<typeof createGiftAssistantActions>;

export const createGiftAssistantActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => ({
  // Gift Assistant Methods
  addGiftRecipientList: (personName: string): string => {
    const newListId = Date.now().toString();
    setAppData(prev => {
        const newOrderIndex = prev.giftRecipientLists.length > 0 
            ? Math.max(...prev.giftRecipientLists.map(l => l.orderIndex), -1) + 1 
            : 0;
        const newList: GiftRecipientList = { 
          id: newListId, 
          personName: personName.trim(), 
          gifts: [],
          knowledge: '',
          orderIndex: newOrderIndex
        };
        return { 
            ...prev, 
            giftRecipientLists: [...prev.giftRecipientLists, newList].sort((a,b) => a.orderIndex - b.orderIndex) 
        };
    });
    return newListId;
  },
  deleteGiftRecipientList: (listId: string) => {
    setAppData(prev => {
      const updatedLists = prev.giftRecipientLists
        .filter(list => list.id !== listId)
        .sort((a,b) => a.orderIndex - b.orderIndex) // Sort before re-indexing
        .map((list, index) => ({ ...list, orderIndex: index })); // Re-assign sequential orderIndex
      return { ...prev, giftRecipientLists: updatedLists };
    });
  },
  updateGiftRecipientListName: (listId: string, newName: string) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, personName: newName.trim() } : list
      ).sort((a,b) => a.orderIndex - b.orderIndex),
    }));
  },
  updateGiftRecipientListKnowledge: (listId: string, knowledge: string) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, knowledge: knowledge } : list
      ).sort((a,b) => a.orderIndex - b.orderIndex),
    }));
  },
  moveGiftRecipientList: (listId: string, direction: 'up' | 'down') => {
    setAppData(prev => {
      const lists = [...prev.giftRecipientLists].sort((a,b) => a.orderIndex - b.orderIndex);
      const currentIndex = lists.findIndex(list => list.id === listId);

      if (currentIndex === -1) return prev; // Should not happen
      if (direction === 'up' && currentIndex === 0) return prev; // Already at top
      if (direction === 'down' && currentIndex === lists.length - 1) return prev; // Already at bottom

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Swap orderIndex values directly
      const currentListOrderIndex = lists[currentIndex].orderIndex;
      lists[currentIndex].orderIndex = lists[targetIndex].orderIndex;
      lists[targetIndex].orderIndex = currentListOrderIndex;
      
      // Re-sort based on updated orderIndex and re-assign sequential indices to ensure integrity
      const updatedLists = lists.sort((a,b) => a.orderIndex - b.orderIndex)
                                .map((list, index) => ({ ...list, orderIndex: index }));

      return { ...prev, giftRecipientLists: updatedLists };
    });
  },
  addGiftItem: (listId: string, itemData: ManualGiftItemData) => {
    const newItem: GiftItem = { 
      id: Date.now().toString(), 
      itemName: itemData.itemName,
      details: itemData.details,
      status: itemData.status || GiftItemStatus.Idea,
      isNew: false, // Manual adds are not "AI New"
      dateAdded: new Date().toISOString(),
      tags: itemData.tags || []
    };
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, gifts: [newItem, ...list.gifts] } : list
      ).sort((a,b) => a.orderIndex - b.orderIndex),
    }));
  },
  updateGiftItem: (listId: string, updatedItem: GiftItem) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId
          ? { ...list, gifts: list.gifts.map(item => item.id === updatedItem.id ? updatedItem : item) }
          : list
      ).sort((a,b) => a.orderIndex - b.orderIndex),
    }));
  },
  deleteGiftItem: (listId: string, itemId: string) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, gifts: list.gifts.filter(item => item.id !== itemId) } : list
      ).sort((a,b) => a.orderIndex - b.orderIndex),
    }));
  },
  clearIsNewFlagForItem: (listId: string, itemId: string) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            gifts: list.gifts.map(item => 
              item.id === itemId ? { ...item, isNew: false, dateNewClearTimestamp: undefined } : item
            )
          };
        }
        return list;
      }).sort((a,b) => a.orderIndex - b.orderIndex),
    }));
  },
  processAISuggestionsForConfirmation: (aiSuggestions: SinglePersonGiftSuggestion[], fallbackListId?: string | null): ProcessedAIResults => {
    const results: ProcessedAIResults = {
      giftsAddedDirectly: [],
      needsUserConfirmation: [], // This will remain empty as AI won't suggest new people.
    };
    let finalLists: GiftRecipientList[] = [];

    setAppData(prev => {
      let currentGiftLists = [...prev.giftRecipientLists];
      
      // Clear isNew flags for all existing items across all lists
      currentGiftLists = currentGiftLists.map(list => ({
          ...list,
          gifts: list.gifts.map(gift => gift.isNew ? { ...gift, isNew: false, dateNewClearTimestamp: undefined } : gift)
      }));

      const giftsToUpdate: Array<{ listIndex: number; giftsToAdd: GiftItem[] }> = [];

      for (const suggestion of aiSuggestions) {
        if (!suggestion.personName || !suggestion.gifts || suggestion.gifts.length === 0) {
          continue;
        }

        // AI is now expected to return personName matching an existing list or the primaryTargetPerson (which should map to an existing list or fallback)
        let targetList = currentGiftLists.find(l => l.personName === suggestion.personName);
        let targetListId = targetList?.id;

        if (!targetList && fallbackListId) { // Fallback if AI somehow missed or primaryTargetPerson needs this
          targetList = currentGiftLists.find(l => l.id === fallbackListId);
          targetListId = targetList?.id;
        }
        
        if (!targetList && currentGiftLists.length > 0) { // Deep fallback to the first list
           console.warn(`AI suggested gifts for '${suggestion.personName}' which couldn't be mapped. Attaching to first available list.`);
           targetList = currentGiftLists.sort((a,b) => a.orderIndex - b.orderIndex)[0];
           targetListId = targetList.id;
        }


        if (targetList && targetListId) {
          const listIndex = currentGiftLists.findIndex(l => l.id === targetListId);
          if (listIndex !== -1) {
            const newGiftItems: GiftItem[] = suggestion.gifts
              .filter(sg => sg.itemName && sg.itemName.trim() !== "")
              .map(sg => ({
                id: `${Date.now()}-${(Math.random().toString(36) + "00000000000000000").slice(2, 9)}`, // Using template literal and ensuring substring length
                itemName: sg.itemName.trim(),
                details: sg.details?.trim(),
                status: GiftItemStatus.Idea,
                isNew: true,
                dateNewClearTimestamp: Date.now() + NEW_TAG_DURATION_MS,
                tags: [], 
                dateAdded: new Date().toISOString(),
              }));

            if (newGiftItems.length > 0) {
               giftsToUpdate.push({ listIndex, giftsToAdd: newGiftItems });
               results.giftsAddedDirectly.push({
                 listId: targetListId,
                 personName: targetList.personName,
                 giftsAddedCount: newGiftItems.length,
               });
            }
          }
        } else {
            console.warn(`Could not find a target list for suggestion for '${suggestion.personName}'. Gifts were not added.`);
        }
      }
      
      giftsToUpdate.forEach(update => {
         currentGiftLists[update.listIndex] = {
              ...currentGiftLists[update.listIndex],
              gifts: [...update.giftsToAdd, ...currentGiftLists[update.listIndex].gifts],
            };
      });
      finalLists = currentGiftLists.sort((a,b) => a.orderIndex - b.orderIndex);
      return { ...prev, giftRecipientLists: finalLists };
    });
    return results;
  },
  addConfirmedAIGifts: (listId: string, gifts: AISuggestedGiftItem[]) => {
    // This function might become simpler or less used if AI confirmation for new people is removed.
    // For now, it assumes gifts are being added to an existing listId.
    setAppData(prev => {
      let updatedLists = prev.giftRecipientLists.map(list => ({
          ...list,
          gifts: list.gifts.map(gift => gift.isNew ? { ...gift, isNew: false, dateNewClearTimestamp: undefined } : gift)
      }));

      const listIndex = updatedLists.findIndex(l => l.id === listId);
      if (listIndex === -1) return { ...prev, giftRecipientLists: updatedLists.sort((a,b) => a.orderIndex - b.orderIndex) }; 

      const newGiftItems: GiftItem[] = gifts
        .filter(sg => sg.itemName && sg.itemName.trim() !== "")
        .map(sg => ({
          id: `${Date.now()}-${(Math.random().toString(36) + "00000000000000000").slice(2, 9)}`, // Using template literal and ensuring substring length
          itemName: sg.itemName.trim(),
          details: sg.details?.trim(),
          status: GiftItemStatus.Idea,
          isNew: true,
          dateNewClearTimestamp: Date.now() + NEW_TAG_DURATION_MS,
          tags: [],
          dateAdded: new Date().toISOString(),
        }));

      if (newGiftItems.length === 0) return { ...prev, giftRecipientLists: updatedLists.sort((a,b) => a.orderIndex - b.orderIndex) };

      updatedLists[listIndex] = {
        ...updatedLists[listIndex],
        gifts: [...newGiftItems, ...updatedLists[listIndex].gifts],
      };
      return { ...prev, giftRecipientLists: updatedLists.sort((a,b) => a.orderIndex - b.orderIndex) };
    });
  },
  getGiftRecipientLists: (): GiftRecipientList[] => {
      const appData = getAppData();
      return [...appData.giftRecipientLists].sort((a,b) => a.orderIndex - b.orderIndex); // Line 255, no change needed based on error
  }
});
