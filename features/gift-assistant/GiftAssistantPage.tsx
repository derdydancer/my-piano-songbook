
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { GiftRecipientList, GiftItem, ManualGiftItemData, GiftItemStatus, SinglePersonGiftSuggestion, ProcessedAIResults, CustomAIContext, AISuggestedGiftItem } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import TextArea from '../../components/common/TextArea';
import Modal from '../../components/Modal';
import { PlusCircleIcon, TrashIcon, PencilIcon, MicrophoneIcon, PhotoIcon, InformationCircleIcon, RefreshCwIcon, ClipboardCopyIcon, ChevronUpIcon, ChevronDownIcon } from '../../components/common/Icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import { geminiService } from '../../services/geminiService';
import AlertModal from '../../components/common/AlertModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import CollapsibleSection from '../../components/common/CollapsibleSection';
import { NEW_TAG_DURATION_MS } from './giftAssistant.data'; // Import from local data/constants module

// Helper to get a unique ID for modals if multiple are on the page
let modalIdCounter = 0;
const getUniqueModalId = (prefix: string) => `${prefix}-${modalIdCounter++}`;


interface GiftItemFormProps {
  listId: string;
  onSave: (listId: string, itemData: ManualGiftItemData, existingItemId?: string) => void;
  onClose: () => void;
  existingItem?: GiftItem;
  personName: string;
  openAlert: (title: string, message: string) => void;
}

const GiftItemFormModal: React.FC<GiftItemFormProps> = ({ listId, onSave, onClose, existingItem, personName, openAlert }) => {
  const [itemName, setItemName] = useState(existingItem?.itemName || '');
  const [details, setDetails] = useState(existingItem?.details || '');
  const [tags, setTags] = useState(existingItem?.tags?.join(', ') || '');
  const [status, setStatus] = useState(existingItem?.status || GiftItemStatus.Idea);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      openAlert("Error", "Item name is required.");
      return;
    }
    onSave(listId, {
      itemName: itemName.trim(),
      details: details.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      status
    }, existingItem?.id);
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={existingItem ? `Edit Gift for ${personName}` : `Add Gift for ${personName}`}
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit}>Save Gift</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Item Name" value={itemName} onChange={e => setItemName(e.target.value)} required />
        <TextArea label="Details (Optional)" value={details} onChange={e => setDetails(e.target.value)} rows={3} />
        <Input label="Tags (Optional, comma-separated)" value={tags} onChange={e => setTags(e.target.value)} />
        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-medium text-textSecondary">Status</label>
          <select
            id="status"
            value={status}
            onChange={e => setStatus(e.target.value as GiftItemStatus)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-card border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md text-textPrimary"
          >
            {Object.values(GiftItemStatus).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
};


const GiftAssistantPage: React.FC = () => {
  const {
    // giftRecipientLists, // Use getGiftRecipientLists() instead
    getGiftRecipientLists, // New getter for lists
    addGiftRecipientList, deleteGiftRecipientList, updateGiftRecipientListName, 
    updateGiftRecipientListKnowledge, moveGiftRecipientList,
    addGiftItem, updateGiftItem, deleteGiftItem, clearIsNewFlagForItem,
    processAISuggestionsForConfirmation, addConfirmedAIGifts
  } = useAppData();
  
  const giftRecipientLists = getGiftRecipientLists(); // Get lists via the new accessor

  const [isListFormModalOpen, setIsListFormModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<GiftRecipientList | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newKnowledge, setNewKnowledge] = useState('');

  const [isGiftFormModalOpen, setIsGiftFormModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [currentListIdForGift, setCurrentListIdForGift] = useState<string | null>(null);

  const [alertModalInfo, setAlertModalInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });
  const [confirmModalInfo, setConfirmModalInfo] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonVariant?: 'primary'|'danger'|'secondary' }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiConfirmationNeeded, setAiConfirmationNeeded] = useState<SinglePersonGiftSuggestion[]>([]);
  const [selectedListForAIConfirm, setSelectedListForAIConfirm] = useState<string | null>(null);
  const [customAIContext, setCustomAIContext] = useState<CustomAIContext | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const openAlert = (title: string, message: string) => setAlertModalInfo({ isOpen: true, title, message });
  const closeAlert = () => setAlertModalInfo({ isOpen: false, title: '', message: '' });
  const openConfirm = (title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonVariant?: 'primary'|'danger'|'secondary') => setConfirmModalInfo({ isOpen: true, title, message, onConfirm, confirmText, confirmButtonVariant });
  const closeConfirm = () => setConfirmModalInfo({ isOpen: false, title: '', message: '', onConfirm: () => {} });


  const handleSaveList = () => {
    if (!newListName.trim()) {
      openAlert("Error", "Person's name cannot be empty.");
      return;
    }
    if (editingList) {
      updateGiftRecipientListName(editingList.id, newListName.trim());
      updateGiftRecipientListKnowledge(editingList.id, newKnowledge.trim());
    } else {
      const newListId = addGiftRecipientList(newListName.trim());
      updateGiftRecipientListKnowledge(newListId, newKnowledge.trim());
    }
    setIsListFormModalOpen(false);
    setNewListName('');
    setNewKnowledge('');
    setEditingList(null);
  };
  
  const handleDeleteList = (listId: string) => {
    openConfirm(
      "Delete List",
      "Are you sure you want to delete this list and all its gifts? This action cannot be undone.",
      () => {
        deleteGiftRecipientList(listId);
        closeConfirm();
      },
      "Delete",
      "danger"
    );
  };

  const handleSaveGiftItem = (listId: string, itemData: ManualGiftItemData, existingItemId?: string) => {
    if (existingItemId) {
      const originalItem = giftRecipientLists.find(l => l.id === listId)?.gifts.find(g => g.id === existingItemId);
      if (originalItem) {
        updateGiftItem(listId, { ...originalItem, ...itemData, isNew: originalItem.isNew, dateNewClearTimestamp: originalItem.dateNewClearTimestamp }); // Preserve isNew from AI
      }
    } else {
      addGiftItem(listId, itemData); // Manual adds are not "New" from AI
    }
    setIsGiftFormModalOpen(false);
    setEditingGift(null);
    setCurrentListIdForGift(null);
  };
  
  const handleDeleteGift = (listId: string, itemId: string) => {
     openConfirm(
      "Delete Gift",
      "Are you sure you want to delete this gift idea?",
      () => {
        deleteGiftItem(listId, itemId);
        closeConfirm();
      },
      "Delete",
      "danger"
    );
  };

  const handleOpenListForm = (list?: GiftRecipientList) => {
    setEditingList(list || null);
    setNewListName(list?.personName || '');
    setNewKnowledge(list?.knowledge || '');
    setIsListFormModalOpen(true);
  };

  const handleOpenGiftForm = (listId: string, gift?: GiftItem) => {
    setCurrentListIdForGift(listId);
    setEditingGift(gift || null);
    setIsGiftFormModalOpen(true);
  };
  
  const getPersonNameFromId = (listId: string | null) => giftRecipientLists.find(l => l.id === listId)?.personName || 'Unknown';

  const handleCopyList = (list: GiftRecipientList) => {
    const listContent = list.gifts.map(gift => {
      let itemStr = gift.itemName;
      if (gift.details) {
        itemStr += ` (${gift.details})`;
      }
      return itemStr;
    }).join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(listContent)
        .then(() => openAlert("Success", `Gift list for ${list.personName} copied to clipboard!`))
        .catch(err => openAlert("Error", `Could not copy list: ${err}`));
    } else {
      openAlert("Error", "Clipboard API not available in this browser.");
    }
  };
  
  // Effect for "New!" tag timeout
  useEffect(() => {
    const now = Date.now();
    let timeoutIds: NodeJS.Timeout[] = [];

    giftRecipientLists.forEach(list => {
      list.gifts.forEach(gift => {
        if (gift.isNew && gift.dateNewClearTimestamp && gift.dateNewClearTimestamp <= now) {
          // Already expired, clear immediately
          clearIsNewFlagForItem(list.id, gift.id);
        } else if (gift.isNew && gift.dateNewClearTimestamp) {
          // Set timeout for future expiry
          const delay = gift.dateNewClearTimestamp - now;
          const timeoutId = setTimeout(() => {
            clearIsNewFlagForItem(list.id, gift.id);
          }, delay);
          timeoutIds.push(timeoutId);
        }
      });
    });

    return () => {
      timeoutIds.forEach(clearTimeout); // Cleanup timeouts
    };
  }, [giftRecipientLists, clearIsNewFlagForItem]);


  // --- AI Related Functions ---
  const handleAISubmit = async (promptText: string, imageFile?: File) => {
    if (!promptText.trim() && !imageFile) {
      openAlert("AI Prompt", "Please enter a text prompt or select an image.");
      return;
    }
    setIsLoadingAI(true);
    setAiConfirmationNeeded([]);
    
    const allNames = giftRecipientLists.map(l => l.personName);
    const targetPersonName = customAIContext?.personName || (giftRecipientLists.length > 0 ? giftRecipientLists[0].personName : "My Friend");
    const knowledge = customAIContext?.knowledge;
    const existingGifts = customAIContext?.existingGifts;

    try {
      let results: SinglePersonGiftSuggestion[] | null = null;
      if (imageFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          results = await geminiService.generateGiftIdeasFromImage(base64Data, imageFile.type, targetPersonName, allNames, knowledge, existingGifts);
          processAIResults(results);
        };
        reader.readAsDataURL(imageFile);
        if(imageInputRef.current) imageInputRef.current.value = ""; 
      } else {
        results = await geminiService.generateGiftIdeasFromText(promptText, targetPersonName, allNames, knowledge, existingGifts);
        processAIResults(results);
      }
      setAiPrompt(''); 
    } catch (error: any) {
      openAlert("AI Error", `Failed to get suggestions: ${error.message}`);
      setIsLoadingAI(false);
    }
  };

  const processAIResults = (suggestions: SinglePersonGiftSuggestion[] | null) => {
    if (suggestions) {
      const defaultListIdForFallback = customAIContext?.listId || (giftRecipientLists.length > 0 ? giftRecipientLists.sort((a,b)=>a.orderIndex - b.orderIndex)[0].id : null);
      const { giftsAddedDirectly, needsUserConfirmation } = processAISuggestionsForConfirmation(suggestions, defaultListIdForFallback);
      
      let message = "";
      if(giftsAddedDirectly.length > 0){
        message += giftsAddedDirectly.map(r => `${r.giftsAddedCount} gift(s) added to ${r.personName}'s list.`).join('\n');
      }
      if(needsUserConfirmation.length > 0){
        message += (message ? "\n\n" : "") + `${needsUserConfirmation.length} suggestion(s) for new people need your confirmation.`;
        setAiConfirmationNeeded(needsUserConfirmation);
      }
      if(!message && suggestions.length === 0) message = "AI didn't find any specific gift ideas, or couldn't match to existing lists clearly. Try a more specific prompt.";
      else if (!message && suggestions.length > 0) message = "AI suggestions processed. Some might need confirmation if for new people."
      
      openAlert("AI Suggestions", message);

    } else {
      openAlert("AI Response", "No suggestions received or failed to parse AI response.");
    }
    setIsLoadingAI(false);
     if(customAIContext) setCustomAIContext(null); 
  };
  
  const handleConfirmAISuggestion = (suggestion: SinglePersonGiftSuggestion) => {
    let targetListId = selectedListForAIConfirm;
    if (selectedListForAIConfirm === 'new') {
        const newName = suggestion.personName || "New Person";
        targetListId = addGiftRecipientList(newName); // This function now returns the new list ID
        openAlert("List Created", `New list created for ${newName}.`);
    }

    if (targetListId) {
        addConfirmedAIGifts(targetListId, suggestion.gifts);
        openAlert("Gifts Added", `${suggestion.gifts.length} gift(s) added to the selected list.`);
    } else {
        openAlert("Error", "Could not determine a list to add gifts to. Please select a list or 'Create New'.");
    }
    setAiConfirmationNeeded(prev => prev.filter(s => s !== suggestion));
    setSelectedListForAIConfirm(null); // Reset selection
  };

  const handleSetCustomAIContext = (list: GiftRecipientList) => {
    setCustomAIContext({
      listId: list.id,
      personName: list.personName,
      knowledge: list.knowledge,
      existingGifts: list.gifts.map(g => ({ itemName: g.itemName, details: g.details }))
    });
    openAlert("Context Set", `AI will now focus on personalized suggestions for ${list.personName}. Provide a general prompt or an image.`);
  };


  return (
    <div className="p-4 space-y-6 mb-16">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-textPrimary">Gift Assistant</h1>
        <Button onClick={() => handleOpenListForm()} leftIcon={<PlusCircleIcon className="w-5 h-5" />}>
          New List
        </Button>
      </div>

      <CollapsibleSection title={customAIContext ? `AI Brainstorming for ${customAIContext.personName}` : "AI Gift Brainstorm"} initialOpen={true}>
        <div className="space-y-3 p-1">
          {customAIContext && (
             <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700 p-2 rounded-md">
               <InformationCircleIcon className="w-5 h-5 inline mr-1" /> 
               Focusing on: <strong>{customAIContext.personName}</strong>. 
               Knowledge: "{customAIContext.knowledge?.substring(0,50) || 'N/A'}{customAIContext.knowledge && customAIContext.knowledge.length > 50 ? '...' : ''}".
               Existing Ideas: {customAIContext.existingGifts.length}.
               <Button variant="ghost" size="sm" onClick={() => setCustomAIContext(null)} className="ml-2 text-blue-500 dark:text-blue-300 underline">Clear Focus</Button>
            </div>
          )}
          <TextArea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="Describe the person, occasion, or gift ideas (e.g., 'birthday gift for my tech-loving dad', 'unique gifts for someone who has everything', 'ideas related to this image')..."
            rows={3}
            containerClassName="mb-0"
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex gap-2">
              <Button onClick={() => handleAISubmit(aiPrompt)} disabled={isLoadingAI} leftIcon={<MicrophoneIcon className="w-5 h-5"/>}>
                {isLoadingAI ? <LoadingSpinner size="sm" /> : "Get Text Ideas"}
              </Button>
              <Button variant="ghost" onClick={() => imageInputRef.current?.click()} disabled={isLoadingAI} leftIcon={<PhotoIcon className="w-5 h-5"/>}>
                {isLoadingAI ? <LoadingSpinner size="sm" /> : "Use Image"}
              </Button>
            </div>
            <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={(e) => e.target.files && e.target.files.length > 0 && handleAISubmit(aiPrompt || "Gift ideas from image", e.target.files[0])} />
            <Button variant="ghost" size="sm" onClick={() => { setAiPrompt(''); if(imageInputRef.current) imageInputRef.current.value = ""; }} disabled={isLoadingAI} leftIcon={<RefreshCwIcon className="w-4 h-4"/>}>
                Clear Prompt
            </Button>
          </div>
          {geminiService.getApiKeyStatus() !== 'valid' && 
             <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                <InformationCircleIcon className="w-3 h-3 inline mr-1"/>
                Gemini API key is not configured or invalid. AI features may not work. Check Settings.
            </p>
          }
        </div>
      </CollapsibleSection>

      {aiConfirmationNeeded.length > 0 && (
        <CollapsibleSection title="Confirm AI Suggestions for New People" initialOpen={true}>
           <div className="space-y-4">
            {aiConfirmationNeeded.map((suggestion, idx) => (
                <div key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-md">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Gifts for "{suggestion.personName}" (New Person Candidate):</h4>
                    <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 my-1">
                        {suggestion.gifts.map((gift, gIdx) => <li key={gIdx}>{gift.itemName}{gift.details ? ` (${gift.details})` : ''}</li>)}
                    </ul>
                    <div className="mt-2 space-y-2 sm:space-y-0 sm:flex sm:items-end sm:space-x-2">
                        <div className="flex-grow">
                            <label htmlFor={`assign-${idx}`} className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Assign to:</label>
                            <select 
                                id={`assign-${idx}`}
                                onChange={(e) => setSelectedListForAIConfirm(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-1.5 text-sm bg-card border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary rounded-md text-textPrimary"
                                defaultValue=""
                            >
                                <option value="" disabled>Select a list or create new</option>
                                <option value="new">Create New List for "{suggestion.personName}"</option>
                                {giftRecipientLists.map(list => <option key={list.id} value={list.id}>{list.personName}</option>)}
                            </select>
                        </div>
                        <Button size="sm" onClick={() => handleConfirmAISuggestion(suggestion)} disabled={!selectedListForAIConfirm}>Confirm & Add</Button>
                    </div>
                </div>
            ))}
           </div>
        </CollapsibleSection>
      )}


      {giftRecipientLists.length === 0 && !isLoadingAI && aiConfirmationNeeded.length === 0 && (
        <p className="text-center text-textSecondary py-8">No gift lists yet. Click "New List" to start organizing your gift ideas!</p>
      )}

      {giftRecipientLists.map((list, index, arr) => (
        <CollapsibleSection 
            key={list.id} 
            title={list.personName} 
            initialOpen={list.gifts.some(g => g.isNew)} 
            headerContent={
                 <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); moveGiftRecipientList(list.id, 'up'); }} disabled={index === 0} aria-label={`Move ${list.personName} list up`} leftIcon={<ChevronUpIcon className="w-4 h-4"/>}>Up</Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); moveGiftRecipientList(list.id, 'down'); }} disabled={index === arr.length - 1} aria-label={`Move ${list.personName} list down`} leftIcon={<ChevronDownIcon className="w-4 h-4"/>}>Down</Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenListForm(list);}} aria-label={`Edit ${list.personName} list`} leftIcon={<PencilIcon className="w-4 h-4"/>}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id);}} aria-label={`Delete ${list.personName} list`} leftIcon={<TrashIcon className="w-4 h-4 text-red-500"/>}>Delete</Button>
                 </div>
            }
        >
            <div className="space-y-3">
                {list.knowledge && <p className="text-sm text-textSecondary italic p-2 bg-background dark:bg-gray-700 rounded-md">Knowledge: {list.knowledge}</p>}
                <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <Button onClick={() => handleOpenGiftForm(list.id)} leftIcon={<PlusCircleIcon className="w-4 h-4"/>} size="sm">Add Gift</Button>
                    <Button variant="ghost" onClick={() => handleSetCustomAIContext(list)} size="sm" className="text-primary dark:text-primary">Brainstorm for {list.personName}...</Button>
                    <Button variant="ghost" onClick={() => handleCopyList(list)} size="sm" leftIcon={<ClipboardCopyIcon className="w-4 h-4"/>}>Copy List</Button>
                </div>
                {list.gifts.length === 0 ? (
                    <p className="text-sm text-textSecondary py-2">No gift ideas for {list.personName} yet.</p>
                ) : (
                    <ul className="space-y-2">
                    {list.gifts.map(gift => (
                        <li key={gift.id} className={`p-3 rounded-md shadow-sm ${gift.isNew ? 'bg-blue-50 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' : 'bg-background dark:bg-gray-700'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                            <h4 className={`font-semibold ${gift.isNew ? 'text-blue-700 dark:text-blue-300' : 'text-textPrimary'}`}>{gift.itemName}</h4>
                            {gift.details && <p className="text-xs text-textSecondary mt-0.5">{gift.details}</p>}
                            <p className="text-xs text-textSecondary mt-0.5">Status: <span className="font-medium">{gift.status}</span> {gift.tags && gift.tags.length > 0 && `| Tags: ${gift.tags.join(', ')}`}</p>
                            </div>
                            <div className="flex-shrink-0 space-x-1 self-start">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenGiftForm(list.id, gift)} aria-label={`Edit ${gift.itemName}`} leftIcon={<PencilIcon className="w-4 h-4"/>}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteGift(list.id, gift.id)} aria-label={`Delete ${gift.itemName}`} leftIcon={<TrashIcon className="w-4 h-4 text-red-500"/>}>Delete</Button>
                            </div>
                        </div>
                        {gift.isNew && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">New! (AI Suggestion)</p>}
                        </li>
                    ))}
                    </ul>
                )}
            </div>
        </CollapsibleSection>
      ))}

      {isListFormModalOpen && (
        <Modal
          isOpen={isListFormModalOpen}
          onClose={() => { setIsListFormModalOpen(false); setEditingList(null); }}
          title={editingList ? 'Edit Gift List' : 'Create New Gift List'}
          footer={
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => { setIsListFormModalOpen(false); setEditingList(null); }}>Cancel</Button>
              <Button onClick={handleSaveList}>Save List</Button>
            </div>
          }
        >
          <form onSubmit={(e) => {e.preventDefault(); handleSaveList();}} className="space-y-4">
            <Input label="Person's Name / List Title" value={newListName} onChange={e => setNewListName(e.target.value)} required />
            <TextArea label="Knowledge about this person (Optional)" value={newKnowledge} onChange={e => setNewKnowledge(e.target.value)} rows={3} placeholder="Likes, dislikes, hobbies, sizes, past gifts, etc." />
          </form>
        </Modal>
      )}

      {isGiftFormModalOpen && currentListIdForGift && (
        <GiftItemFormModal
          listId={currentListIdForGift}
          onSave={handleSaveGiftItem}
          onClose={() => { setIsGiftFormModalOpen(false); setEditingGift(null); setCurrentListIdForGift(null); }}
          existingItem={editingGift || undefined}
          personName={getPersonNameFromId(currentListIdForGift)}
          openAlert={openAlert}
        />
      )}
      
      <AlertModal
        isOpen={alertModalInfo.isOpen}
        onClose={closeAlert}
        title={alertModalInfo.title}
        message={alertModalInfo.message}
      />
      <ConfirmationModal
        isOpen={confirmModalInfo.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModalInfo.onConfirm}
        title={confirmModalInfo.title}
        message={confirmModalInfo.message}
        confirmText={confirmModalInfo.confirmText}
        confirmButtonVariant={confirmModalInfo.confirmButtonVariant}
      />

    </div>
  );
};

export default GiftAssistantPage;
