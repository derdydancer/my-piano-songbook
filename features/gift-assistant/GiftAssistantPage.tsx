

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { GiftRecipientList, GiftItem, ManualGiftItemData, GiftItemStatus, SinglePersonGiftSuggestion, ProcessedAIResults, CustomAIContext, AISuggestedGiftItem } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import TextArea from '../../components/common/TextArea';
import Modal from '../../components/Modal';
import Select from '../../components/common/Select'; // Added Select import
import { PlusCircleIcon, TrashIcon, PencilIcon, MicrophoneIcon, PhotoIcon, InformationCircleIcon, RefreshCwIcon, ClipboardCopyIcon, ChevronUpIcon, ChevronDownIcon, CameraIcon, QueueListIcon, XMarkIcon } from '../../components/common/Icons'; // Added CameraIcon, QueueListIcon
import LoadingSpinner from '../../components/LoadingSpinner';
import { geminiService, GiftOperationType } from '../../services/geminiService'; // Import GiftOperationType
import AlertModal from '../../components/common/AlertModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import CollapsibleSection from '../../components/common/CollapsibleSection';
import { NEW_TAG_DURATION_MS } from './giftAssistant.data';

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
    getGiftRecipientLists, 
    addGiftRecipientList, deleteGiftRecipientList, updateGiftRecipientListName, 
    updateGiftRecipientListKnowledge, moveGiftRecipientList,
    addGiftItem, updateGiftItem, deleteGiftItem, clearIsNewFlagForItem,
    processAISuggestionsForConfirmation, 
  } = useAppData();
  
  const giftRecipientLists = getGiftRecipientLists(); 

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
  const [customAIContext, setCustomAIContext] = useState<CustomAIContext | null>(null);
  const [selectedPersonIdForAI, setSelectedPersonIdForAI] = useState<string>("");
  
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);


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
        if (customAIContext?.listId === listId || selectedPersonIdForAI === listId) {
            setCustomAIContext(null);
            setSelectedPersonIdForAI("");
        }
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
        updateGiftItem(listId, { ...originalItem, ...itemData, isNew: originalItem.isNew, dateNewClearTimestamp: originalItem.dateNewClearTimestamp });
      }
    } else {
      addGiftItem(listId, itemData);
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
  
  const getPersonNameFromId = (listId: string | null): string => {
    return giftRecipientLists.find(l => l.id === listId)?.personName || 'Unknown';
  }

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
  
  useEffect(() => {
    const now = Date.now();
    let timeoutIds: number[] = []; 

    giftRecipientLists.forEach(list => {
      list.gifts.forEach(gift => {
        if (gift.isNew && gift.dateNewClearTimestamp && gift.dateNewClearTimestamp <= now) {
          clearIsNewFlagForItem(list.id, gift.id);
        } else if (gift.isNew && gift.dateNewClearTimestamp) {
          const delay = gift.dateNewClearTimestamp - now;
          const timeoutId = window.setTimeout(() => {
            clearIsNewFlagForItem(list.id, gift.id);
          }, delay);
          timeoutIds.push(timeoutId);
        }
      });
    });

    return () => {
      timeoutIds.forEach(id => window.clearTimeout(id)); 
    };
  }, [giftRecipientLists, clearIsNewFlagForItem]);


  // --- AI Related Functions ---
  const handleAISubmit = async (promptText: string, aiActionType: GiftOperationType, imageFileForSubmit?: File | null) => {
    if (!promptText.trim() && !imageFileForSubmit) {
      openAlert("AI Prompt", "Please enter a text prompt or attach an image.");
      return;
    }
    if (aiActionType === 'recommend_for_person' && !selectedPersonIdForAI) {
        openAlert("Person Required", "Please select a person to generate recommendations for.");
        return;
    }

    setIsLoadingAI(true);
    
    const allNames = giftRecipientLists.map(l => l.personName);
    let targetPersonName: string;
    let knowledge: string | undefined;
    let existingGifts: AISuggestedGiftItem[] | undefined;
    let hasCtx = false;

    if (aiActionType === 'recommend_for_person' && customAIContext) {
        targetPersonName = customAIContext.personName;
        knowledge = customAIContext.knowledge;
        existingGifts = customAIContext.existingGifts;
        hasCtx = true;
    } else {
        targetPersonName = customAIContext?.personName || (giftRecipientLists.length > 0 ? giftRecipientLists.sort((a,b)=>a.orderIndex - b.orderIndex)[0].personName : "My Friend");
        // For 'parse_and_assign', knowledge/existingGifts might be less relevant or handled differently by AI.
        // Here, we still pass them if customAIContext is set (e.g., from brainstorm button), AI can choose to use them.
        if (customAIContext) {
            knowledge = customAIContext.knowledge;
            existingGifts = customAIContext.existingGifts;
            hasCtx = true; // Even for parsing, if a context was set, let the AI know.
        }
    }


    try {
      let results: SinglePersonGiftSuggestion[] | null = null;
      if (imageFileForSubmit) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          results = await geminiService.generateGiftIdeasFromImage(
            base64Data, 
            imageFileForSubmit.type, 
            targetPersonName, 
            allNames, 
            knowledge, 
            existingGifts, 
            hasCtx,
            aiActionType
          );
          processAIResults(results);
        };
        reader.readAsDataURL(imageFileForSubmit);
      } else {
        results = await geminiService.generateGiftIdeasFromText(
            promptText, 
            targetPersonName, 
            allNames, 
            knowledge, 
            existingGifts, 
            hasCtx,
            aiActionType
        );
        processAIResults(results);
      }
      setAiPrompt(''); 
      setAttachedImageFile(null);
      setAttachedImagePreview(null);
    } catch (error: any) {
      openAlert("AI Error", `Failed to get suggestions: ${error.message}`);
      setIsLoadingAI(false);
    }
  };

  const processAIResults = (suggestions: SinglePersonGiftSuggestion[] | null) => {
    if (suggestions) {
      const defaultListIdForFallback = customAIContext?.listId || selectedPersonIdForAI || (giftRecipientLists.length > 0 ? giftRecipientLists.sort((a,b)=>a.orderIndex - b.orderIndex)[0].id : null);
      const { giftsAddedDirectly } = processAISuggestionsForConfirmation(suggestions, defaultListIdForFallback);
      
      let message = "";
      if(giftsAddedDirectly.length > 0){
        message += giftsAddedDirectly.map(r => `${r.giftsAddedCount} gift(s) added to ${r.personName}'s list.`).join('\n');
      }
      
      if(!message && suggestions.length === 0) message = "AI didn't find any specific gift ideas or couldn't parse them for existing lists. Try a more specific prompt or ensure people mentioned are in your lists.";
      else if (!message && suggestions.length > 0 && giftsAddedDirectly.length === 0) message = "AI processed suggestions, but no items were directly added. This might happen if mentioned people aren't in your lists or no fallback was available."
      else if (!message) message = "AI suggestions processed.";
      
      openAlert("AI Suggestions", message);

    } else {
      openAlert("AI Response", "No suggestions received or failed to parse AI response.");
    }
    setIsLoadingAI(false);
    // Do not clear customAIContext here if it was set by dropdown, only if set by list button.
    // If it was set by a list's "Brainstorm" button, then this will clear it, which is fine.
    // If by dropdown, it should persist. For simplicity now, if it's set, it's cleared for next round unless re-selected.
    // A better UX might be to only clear `customAIContext` if it wasn't derived from `selectedPersonIdForAI`.
    // For now: if `selectedPersonIdForAI` is empty, then `customAIContext` would have come from a brainstorm button, so clear it.
    if (!selectedPersonIdForAI) {
        setCustomAIContext(null);
    }
  };
  
  const handleSetCustomAIContext = useCallback((list: GiftRecipientList | null) => {
    if (list) {
        setCustomAIContext({
            listId: list.id,
            personName: list.personName,
            knowledge: list.knowledge,
            existingGifts: list.gifts.map(g => ({ itemName: g.itemName, details: g.details }))
        });
        setSelectedPersonIdForAI(list.id); // Sync dropdown with brainstorm button
    } else {
        setCustomAIContext(null);
        setSelectedPersonIdForAI("");
    }
  }, [giftRecipientLists]);


  const handlePersonSelectForAI = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const listId = event.target.value;
    setSelectedPersonIdForAI(listId);
    if (listId) {
        const selectedList = giftRecipientLists.find(l => l.id === listId);
        if (selectedList) {
            handleSetCustomAIContext(selectedList);
        }
    } else {
        handleSetCustomAIContext(null); // Clear context if "Select a person" is chosen
    }
  };

  const handleImageAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setAttachedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
     if(imageInputRef.current) imageInputRef.current.value = ""; 
     if(cameraInputRef.current) cameraInputRef.current.value = "";
  };
  
  const clearAllInputs = () => {
    setAiPrompt('');
    setAttachedImageFile(null);
    setAttachedImagePreview(null);
    setSelectedPersonIdForAI("");
    setCustomAIContext(null); // Clear context as well
    if(imageInputRef.current) imageInputRef.current.value = ""; 
    if(cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const personOptionsForAI = [
    { value: "", label: "Select a person..." },
    ...giftRecipientLists.sort((a,b) => a.orderIndex - b.orderIndex).map(list => ({ value: list.id, label: list.personName }))
  ];

  return (
    <div className="p-4 space-y-6 mb-16">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-textPrimary">Gift Assistant</h1>
        <Button onClick={() => handleOpenListForm()} leftIcon={<PlusCircleIcon className="w-5 h-5" />}>
          New List
        </Button>
      </div>

      <CollapsibleSection 
        title={customAIContext && selectedPersonIdForAI ? `AI Helper (Focus: ${customAIContext.personName})` : "AI Gift Helper"} 
        initialOpen={true}
      >
        <div className="space-y-3 p-1">
           <Select
            label="Focus AI Recommendations on:"
            options={personOptionsForAI}
            value={selectedPersonIdForAI}
            onChange={handlePersonSelectForAI}
            containerClassName="mb-2"
          />
          {customAIContext && selectedPersonIdForAI && (
             <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700 p-2 rounded-md">
               <InformationCircleIcon className="w-5 h-5 inline mr-1" /> 
               Knowledge: "{customAIContext.knowledge?.substring(0,50) || 'N/A'}{customAIContext.knowledge && customAIContext.knowledge.length > 50 ? '...' : ''}".
               Existing Ideas: {customAIContext.existingGifts.length}.
               <Button variant="ghost" size="sm" onClick={() => handleSetCustomAIContext(null)} className="ml-2 text-blue-500 dark:text-blue-300 underline">Clear Focus</Button>
            </div>
          )}
          <TextArea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder={
                selectedPersonIdForAI && customAIContext 
                ? `Describe what kind of gift you're looking for ${customAIContext.personName}... (for recommendations)`
                : `Describe gifts and for whom (e.g., 'Book for Dad, perfume for Mom') to add to lists, or general ideas for recommendations (select person first).`
            }
            rows={3}
            containerClassName="mb-0"
          />
          {attachedImagePreview && (
            <div className="mt-2 text-center relative">
              <img src={attachedImagePreview} alt="Attached preview" className="max-w-full max-h-40 mx-auto rounded border border-gray-300 dark:border-gray-600" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setAttachedImageFile(null); setAttachedImagePreview(null); }} 
                className="absolute top-1 right-1 bg-card dark:bg-gray-700 p-0.5 rounded-full text-red-500 hover:text-red-700"
                aria-label="Remove attached image"
              >
                <XMarkIcon className="w-4 h-4"/>
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
              <Button onClick={() => handleAISubmit(aiPrompt, 'parse_and_assign', attachedImageFile)} disabled={isLoadingAI} leftIcon={<QueueListIcon className="w-5 h-5"/>}>
                Add Item(s) to List
              </Button>
              <Button onClick={() => handleAISubmit(aiPrompt, 'recommend_for_person', attachedImageFile)} disabled={isLoadingAI || !selectedPersonIdForAI} leftIcon={<MicrophoneIcon className="w-5 h-5"/>}>
                Generate Recommendations
              </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => imageInputRef.current?.click()} disabled={isLoadingAI} leftIcon={<PhotoIcon className="w-5 h-5"/>}>
                Attach Image
              </Button>
              <Button variant="ghost" onClick={() => cameraInputRef.current?.click()} disabled={isLoadingAI} leftIcon={<CameraIcon className="w-5 h-5"/>}>
                Take Photo
              </Button>
            </div>
            <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleImageAttachment} />
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleImageAttachment} />
            
            <Button variant="ghost" size="sm" onClick={clearAllInputs} disabled={isLoadingAI} leftIcon={<RefreshCwIcon className="w-4 h-4"/>}>
                Clear All
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

      {giftRecipientLists.length === 0 && !isLoadingAI && (
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
                    <Button variant="ghost" onClick={() => {
                        handleSetCustomAIContext(list);
                        // Optionally scroll to AI helper section
                        const aiHelperSection = document.getElementById('collapsible-section-ai-gift-helper'); // Assuming CollapsibleSection generates an ID like this
                        aiHelperSection?.scrollIntoView({ behavior: 'smooth' });
                    }} size="sm" className="text-primary dark:text-primary">Brainstorm for {list.personName}...</Button>
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