
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { GiftRecipientList, GiftItem, GiftItemStatus, SinglePersonGiftSuggestion, AISuggestedGiftItem, ManualGiftItemData, CustomAIContext } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import TextArea from '../../components/common/TextArea';
import Select from '../../components/common/Select';
import Modal from '../../components/Modal';
import { PlusCircleIcon, TrashIcon, PencilIcon, MicrophoneIcon, PhotoIcon, InformationCircleIcon, ClipboardCopyIcon, ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, XCircleIcon as ClearIcon } from '../../components/common/Icons'; // Renamed XCircleIcon for clarity
import { geminiService } from '../../services/geminiService';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DEFAULT_PERSON_SUGGESTION } from '../../constants';
import CollapsibleSection from '../../components/common/CollapsibleSection'; // Updated import path

const GiftAssistantPage: React.FC = () => {
  const {
    giftRecipientLists,
    addGiftRecipientList,
    deleteGiftRecipientList,
    updateGiftRecipientListName,
    updateGiftRecipientListKnowledge,
    addGiftItem,
    updateGiftItem,
    deleteGiftItem,
    processAISuggestionsForConfirmation,
    addConfirmedAIGifts,
  } = useAppData();

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<GiftRecipientList | null>(null);
  const [editingItem, setEditingItem] = useState<GiftItem | null>(null);
  const [listIdForItemModal, setListIdForItemModal] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInputText, setAiInputText] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const speechRecognitionRef = useRef<any | null>(null);
  
  const [selectedStatuses, setSelectedStatuses] = useState<GiftItemStatus[]>([]);
  const [copiedListId, setCopiedListId] = useState<string | null>(null);

  // State for new person confirmation flow
  const [pendingConfirmationQueue, setPendingConfirmationQueue] = useState<SinglePersonGiftSuggestion[]>([]);
  const [currentPendingSuggestion, setCurrentPendingSuggestion] = useState<SinglePersonGiftSuggestion | null>(null);
  const [isNewPersonModalOpen, setIsNewPersonModalOpen] = useState(false);
  const [isAssignToListModalOpen, setIsAssignToListModalOpen] = useState(false);
  const [listIdToAssignTo, setListIdToAssignTo] = useState<string>('');

  // State for custom AI context
  const [customAIContext, setCustomAIContext] = useState<CustomAIContext | null>(null);
  const [editingKnowledgeMap, setEditingKnowledgeMap] = useState<Record<string, string>>({});


  const handleAddList = () => {
    setEditingList(null);
    setNewListName('');
    setIsListModalOpen(true);
  };

  const handleEditList = (list: GiftRecipientList) => {
    setEditingList(list);
    setNewListName(list.personName);
    setIsListModalOpen(true);
  };

  const handleSaveList = () => {
    if (!newListName.trim()) {
      alert('Person name cannot be empty.');
      return;
    }
    if (editingList) {
      updateGiftRecipientListName(editingList.id, newListName.trim());
    } else {
      addGiftRecipientList(newListName.trim());
    }
    setIsListModalOpen(false);
  };

  const handleDeleteList = (listId: string) => {
    if (window.confirm('Are you sure you want to delete this list and all its items?')) {
      deleteGiftRecipientList(listId);
      if (customAIContext?.listId === listId) {
        setCustomAIContext(null); // Clear context if the list being used is deleted
      }
    }
  };

  const handleAddItemToList = (listId: string) => {
    setEditingItem(null);
    setListIdForItemModal(listId);
    setIsItemModalOpen(true);
  };

  const handleEditItemInList = (item: GiftItem, listId: string) => {
    setEditingItem(item);
    setListIdForItemModal(listId);
    setIsItemModalOpen(true);
  };
  
  const handleSaveItemManual = (listId: string, itemData: ManualGiftItemData, existingItemId?: string) => {
    if (existingItemId) {
      const currentItem = giftRecipientLists.find(l => l.id === listId)?.gifts.find(g => g.id === existingItemId);
      if (currentItem) {
        updateGiftItem(listId, { ...currentItem, ...itemData, isNew: false });
      }
    } else {
      addGiftItem(listId, itemData);
    }
    setIsItemModalOpen(false);
    setListIdForItemModal(null);
  };


  const handleDeleteItemInList = (itemId: string, listId: string) => {
    if (window.confirm('Are you sure you want to delete this gift idea?')) {
      deleteGiftItem(listId, itemId);
    }
  };
  
  const processNextPendingSuggestion = useCallback(() => {
    const newQueue = [...pendingConfirmationQueue];
    const nextSuggestion = newQueue.shift(); 
    setPendingConfirmationQueue(newQueue);

    if (nextSuggestion) {
      setCurrentPendingSuggestion(nextSuggestion);
      setIsNewPersonModalOpen(true);
    } else {
      setCurrentPendingSuggestion(null); 
    }
  }, [pendingConfirmationQueue]);


  const handleAiProcess = async (data: string, type: 'text' | string) => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const allRecipientNames = giftRecipientLists.map(l => l.personName);
      let aiSuggestions: SinglePersonGiftSuggestion[] | null = null;

      const currentCustomContext = customAIContext; // Capture current context for this call

      if (type === 'text') {
        aiSuggestions = await geminiService.generateGiftIdeasFromText(
          data, 
          currentCustomContext?.personName || DEFAULT_PERSON_SUGGESTION, 
          allRecipientNames,
          currentCustomContext?.knowledge,
          currentCustomContext?.existingGifts
        );
      } else { 
        aiSuggestions = await geminiService.generateGiftIdeasFromImage(
          data, 
          type, 
          currentCustomContext?.personName || DEFAULT_PERSON_SUGGESTION, 
          allRecipientNames,
          currentCustomContext?.knowledge,
          currentCustomContext?.existingGifts
        );
      }

      if (aiSuggestions && aiSuggestions.length > 0) {
        const fallbackListIdForDirectAdd = currentCustomContext?.listId; // If context is set, AI should focus here
        const { giftsAddedDirectly, needsUserConfirmation } = processAISuggestionsForConfirmation(aiSuggestions, fallbackListIdForDirectAdd);
        
        if (giftsAddedDirectly.length > 0) {
          console.log("Gifts added directly:", giftsAddedDirectly);
        }

        if (needsUserConfirmation.length > 0) {
          setPendingConfirmationQueue(prev => [...prev, ...needsUserConfirmation]);
          if (!currentPendingSuggestion && !isNewPersonModalOpen && !isAssignToListModalOpen) {
             processNextPendingSuggestion(); 
          }
        } else if (giftsAddedDirectly.length === 0) {
           setAiError("AI didn't find relevant suggestions for existing people, or couldn't determine who to assign them to.");
        }
        setAiInputText(''); 
      } else if (aiSuggestions && aiSuggestions.length === 0) {
        setAiError("AI found no specific gift ideas from the input.");
      } else {
        setAiError("AI couldn't find any gift ideas, or the response was not as expected.");
      }
    } catch (error: any) {
      console.error("AI processing error:", error);
      setAiError(error.message || "Failed to process with AI. Ensure API key is configured.");
    } finally {
      setIsLoadingAi(false);
    }
  };
  
  const handleAiProcessText = () => {
    if (!aiInputText.trim()) {
      setAiError("Please enter some text for the AI to process.");
      return;
    }
    handleAiProcess(aiInputText, 'text');
  };
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
            handleAiProcess(base64String, file.type);
        } else {
            setAiError("Could not read image file.");
        }
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (pendingConfirmationQueue.length > 0 && !currentPendingSuggestion && !isNewPersonModalOpen && !isAssignToListModalOpen) {
      processNextPendingSuggestion();
    }
  }, [pendingConfirmationQueue, currentPendingSuggestion, isNewPersonModalOpen, isAssignToListModalOpen, processNextPendingSuggestion]);

  
  const handleConfirmCreateNewPerson = () => {
    if (currentPendingSuggestion) {
      const newListId = addGiftRecipientList(currentPendingSuggestion.personName);
      addConfirmedAIGifts(newListId, currentPendingSuggestion.gifts);
    }
    setIsNewPersonModalOpen(false);
    processNextPendingSuggestion();
  };

  const handleDeclineCreateNewPerson = () => {
    setIsNewPersonModalOpen(false);
    if (giftRecipientLists.length > 0) {
      setListIdToAssignTo(giftRecipientLists[0].id); // Pre-select first
      setIsAssignToListModalOpen(true);
    } else {
      alert("No existing lists to assign to. AI suggestion for new person will be processed as new if confirmed, otherwise discarded.");
      handleConfirmCreateNewPerson(); 
    }
  };

  const handleConfirmAssignToList = () => {
    if (currentPendingSuggestion && listIdToAssignTo) {
      addConfirmedAIGifts(listIdToAssignTo, currentPendingSuggestion.gifts);
    }
    setIsAssignToListModalOpen(false);
    processNextPendingSuggestion();
  };

  const toggleRecording = () => {
    if (isRecording) {
      speechRecognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
         setAiError("Speech recognition is not supported by your browser.");
         return;
      }

      speechRecognitionRef.current = new SpeechRecognitionAPI();
      speechRecognitionRef.current.continuous = false;
      speechRecognitionRef.current.interimResults = false;
      speechRecognitionRef.current.lang = 'en-US';

      speechRecognitionRef.current.onstart = () => setIsRecording(true);
      speechRecognitionRef.current.onend = () => setIsRecording(false);
      speechRecognitionRef.current.onerror = (event: any) => {
        setAiError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };
      speechRecognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAiInputText(prev => prev ? `${prev} ${transcript}` : transcript);
      };
      speechRecognitionRef.current.start();
    }
  };
  
  const handleStatusFilterChange = (status: GiftItemStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getFilteredAndSortedGiftsForList = (list: GiftRecipientList): GiftItem[] => {
    let gifts = [...list.gifts];
    if (selectedStatuses.length > 0) {
      gifts = gifts.filter(gift => selectedStatuses.includes(gift.status));
    }
    gifts.sort((a, b) => {
        if (a.dateAdded && b.dateAdded) {
            return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        }
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return (b.id || "").localeCompare(a.id || "");
    });
    return gifts;
  };

  const handleExportListToClipboard = async (listId: string) => {
    const list = giftRecipientLists.find(l => l.id === listId);
    if (!list) return;

    const filteredGifts = getFilteredAndSortedGiftsForList(list);
    if (filteredGifts.length === 0) {
      alert("No gifts (matching current filters) to export for this list.");
      return;
    }

    let exportText = `Gift Ideas for ${list.personName}:\n`;
    if (list.knowledge) {
        exportText += `Knowledge: ${list.knowledge}\n`;
    }
    filteredGifts.forEach(gift => {
      exportText += `\n- ${gift.itemName}`;
      if (gift.details) {
        exportText += `\n  Details: ${gift.details}`;
      }
      if (gift.tags && gift.tags.length > 0) {
        exportText += `\n  Tags: ${gift.tags.join(', ')}`;
      }
      exportText += `\n  Status: ${gift.status}`;
      if (gift.isNew) exportText += " (New!)";
    });

    try {
      await navigator.clipboard.writeText(exportText);
      setCopiedListId(listId);
      setTimeout(() => setCopiedListId(null), 2000); 
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy list to clipboard.');
    }
  };

  const handleKnowledgeChange = (listId: string, value: string) => {
    setEditingKnowledgeMap(prev => ({ ...prev, [listId]: value }));
  };

  const handleSaveKnowledge = (listId: string) => {
    const knowledgeToSave = editingKnowledgeMap[listId];
    if (typeof knowledgeToSave === 'string') { // Check if it exists to prevent saving undefined
        updateGiftRecipientListKnowledge(listId, knowledgeToSave);
        // Optionally clear from editing map, or let it persist for further edits
        // setEditingKnowledgeMap(prev => {
        //   const newMap = {...prev};
        //   delete newMap[listId];
        //   return newMap;
        // });
    }
  };

  const handleSetCustomAIContext = (list: GiftRecipientList) => {
    // Auto-save current knowledge text before setting context
    const currentKnowledgeText = editingKnowledgeMap[list.id];
    if (typeof currentKnowledgeText === 'string' && currentKnowledgeText !== (list.knowledge || '')) {
        updateGiftRecipientListKnowledge(list.id, currentKnowledgeText);
    }
    
    setCustomAIContext({
      listId: list.id,
      personName: list.personName,
      knowledge: typeof currentKnowledgeText === 'string' ? currentKnowledgeText : (list.knowledge || ''), // Use current text or saved knowledge
      existingGifts: list.gifts.map(g => ({ itemName: g.itemName, details: g.details }))
    });
  };

  const allStatuses = Object.values(GiftItemStatus);
  const sortedGiftRecipientLists = [...giftRecipientLists].sort((a, b) => a.personName.localeCompare(b.personName));

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl font-bold text-textPrimary">Gift Assistant</h1>
        <Button onClick={handleAddList} leftIcon={<PlusCircleIcon className="w-5 h-5" />}>
          New List
        </Button>
      </div>

      <div className="bg-card p-4 rounded-lg shadow space-y-3">
        <h2 className="text-lg font-semibold text-textPrimary">AI Gift Finder</h2>
        <p className="text-sm text-textSecondary flex items-center">
          <InformationCircleIcon className="w-5 h-5 mr-1 text-primary"/>
          AI features require a valid API key. AI may suggest new people for gift lists.
        </p>
        {customAIContext && (
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md text-sm text-blue-700 dark:text-blue-300 flex justify-between items-center">
            <span>
              Custom recommendations active for: <strong className="font-semibold">{customAIContext.personName}</strong>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setCustomAIContext(null)} title="Clear Custom Context">
              <ClearIcon className="w-4 h-4"/>
            </Button>
          </div>
        )}
        <TextArea
          placeholder="Describe gift ideas, e.g., 'My wife Triona loves gardening. My daughter Lily wants a unicorn. My cousin Sarah needs a birthday gift.'"
          value={aiInputText}
          onChange={(e) => setAiInputText(e.target.value)}
          rows={3}
          disabled={isLoadingAi || isNewPersonModalOpen || isAssignToListModalOpen}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAiProcessText} disabled={isLoadingAi || !aiInputText.trim() || isNewPersonModalOpen || isAssignToListModalOpen}>
            {isLoadingAi && aiInputText ? 'Processing Text...' : 'Process Text with AI'}
          </Button>
          <Button
            variant="ghost"
            onClick={toggleRecording}
            leftIcon={<MicrophoneIcon className="w-5 h-5" />}
            className={isRecording ? 'text-red-500 animate-pulse' : ''}
            disabled={isLoadingAi || isNewPersonModalOpen || isAssignToListModalOpen}
          >
            {isRecording ? 'Stop' : 'Record Audio'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => imageInputRef.current?.click()}
            leftIcon={<PhotoIcon className="w-5 h-5" />}
            disabled={isLoadingAi || isNewPersonModalOpen || isAssignToListModalOpen}
          >
            Upload Image
          </Button>
          <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
        </div>
        {isLoadingAi && <LoadingSpinner message="AI is thinking..." />}
        {aiError && <p className="text-sm text-red-500">{aiError}</p>}
      </div>
      
      <div className="mb-4 bg-card p-4 rounded-lg shadow">
          <label className="block text-lg font-semibold text-textPrimary mb-2">Filter All Lists by Status:</label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {allStatuses.map(status => (
              <label key={status} className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 bg-card dark:bg-gray-700 focus:ring-primary"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => handleStatusFilterChange(status)}
                />
                <span className="ml-2 text-sm text-textPrimary">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </label>
            ))}
          </div>
      </div>

      {sortedGiftRecipientLists.length === 0 && !isLoadingAi && (
        <p className="text-center text-textSecondary py-8">No gift lists yet. Create one or use the AI to get started!</p>
      )}

      <div className="space-y-4">
        {sortedGiftRecipientLists.map(list => {
          const displayedGifts = getFilteredAndSortedGiftsForList(list);
          const knowledgeValue = typeof editingKnowledgeMap[list.id] === 'string' ? editingKnowledgeMap[list.id] : (list.knowledge || '');
          const isKnowledgeUnsaved = knowledgeValue !== (list.knowledge || '');

          return (
            <CollapsibleSection 
              key={list.id} 
              title={list.personName}
              initialOpen={true} 
              headerContent={ 
                <div className="flex items-center space-x-1 flex-shrink-0 ml-auto pl-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleAddItemToList(list.id); }}
                        aria-label={`Add gift to ${list.personName}'s list`}
                        title={`Add gift to ${list.personName}'s list`}
                    >
                        <PlusCircleIcon className="w-5 h-5"/>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleEditList(list); }}
                        aria-label={`Edit ${list.personName}'s list name`}
                        title={`Edit ${list.personName}'s list name`}
                    >
                        <PencilIcon className="w-5 h-5"/>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleExportListToClipboard(list.id); }}
                        aria-label={`Export ${list.personName}'s list`}
                        title={`Export ${list.personName}'s list`}
                        disabled={copiedListId === list.id}
                    >
                        {copiedListId === list.id ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <ClipboardCopyIcon className="w-5 h-5"/>}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                        aria-label={`Delete ${list.personName}'s list`}
                        title={`Delete ${list.personName}'s list`}
                    >
                        <TrashIcon className="w-5 h-5 text-red-500"/>
                    </Button>
                </div>
              }
            >
              {displayedGifts.length === 0 ? (
                <p className="text-textSecondary py-2">
                  {selectedStatuses.length > 0 ? "No gifts match the selected status(es) for this list." : "No gift ideas in this list yet."}
                </p>
              ) : (
                <ul className="space-y-3 pt-2">
                  {displayedGifts.map(item => (
                    <GiftItemDisplay
                      key={item.id}
                      item={item}
                      onEdit={() => handleEditItemInList(item, list.id)}
                      onDelete={() => handleDeleteItemInList(item.id, list.id)}
                    />
                  ))}
                </ul>
              )}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <TextArea
                    label={`Knowledge about ${list.personName} (preferences, ideas, etc.)`}
                    value={knowledgeValue}
                    onChange={(e) => handleKnowledgeChange(list.id, e.target.value)}
                    rows={3}
                    placeholder="e.g., Loves sci-fi books, collects vintage tea cups, wears size M."
                    containerClassName="mb-2"
                />
                <div className="flex flex-wrap gap-2">
                    <Button 
                        onClick={() => handleSaveKnowledge(list.id)} 
                        size="sm"
                        disabled={!isKnowledgeUnsaved}
                    >
                        Save Knowledge
                    </Button>
                    <Button 
                        onClick={() => handleSetCustomAIContext(list)} 
                        size="sm" 
                        variant={customAIContext?.listId === list.id ? "primary" : "secondary"}
                        className={customAIContext?.listId === list.id ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-300' : ''}
                    >
                        {customAIContext?.listId === list.id ? 'Using for AI Recs' : 'Use for Custom AI Recs'}
                    </Button>
                </div>
              </div>
            </CollapsibleSection>
          );
        })}
      </div>


      <Modal isOpen={isListModalOpen} onClose={() => setIsListModalOpen(false)} title={editingList ? 'Edit List Name' : 'Create New List'}>
        <Input
          label="Person's Name"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="e.g., Triona (Wife), Mom, John Doe"
        />
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="ghost" onClick={() => setIsListModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveList}>{editingList ? 'Save Name' : 'Create List'}</Button>
        </div>
      </Modal>
      
      {isItemModalOpen && listIdForItemModal && (
        <GiftItemFormModal
            isOpen={isItemModalOpen}
            onClose={() => { setIsItemModalOpen(false); setListIdForItemModal(null); }}
            onSave={(itemData) => handleSaveItemManual(listIdForItemModal, itemData, editingItem?.id)}
            existingItem={editingItem}
        />
      )}

      <Modal isOpen={isNewPersonModalOpen && currentPendingSuggestion != null} onClose={() => { setIsNewPersonModalOpen(false); processNextPendingSuggestion();}} title="Confirm New Person">
        <p className="text-textPrimary">
          AI suggests gifts for a new person: <strong className="text-primary">{currentPendingSuggestion?.personName}</strong>.
        </p>
        <p className="text-textSecondary text-sm mt-1">Is this a new person you'd like to create a list for?</p>
        <div className="mt-2">
            <h4 className="text-sm font-semibold text-textPrimary">Suggested Gifts:</h4>
            <ul className="text-xs list-disc list-inside pl-2 text-textSecondary max-h-32 overflow-y-auto">
                {currentPendingSuggestion?.gifts.map((gift, idx) => (
                    <li key={idx}>{gift.itemName}{gift.details ? ` (${gift.details})` : ''}</li>
                ))}
            </ul>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="ghost" onClick={() => {setIsNewPersonModalOpen(false); handleDeclineCreateNewPerson();}}>No, Assign to Existing</Button>
          <Button onClick={handleConfirmCreateNewPerson}>Yes, Create New List</Button>
        </div>
      </Modal>

      <Modal isOpen={isAssignToListModalOpen && currentPendingSuggestion != null} onClose={() => {setIsAssignToListModalOpen(false); processNextPendingSuggestion();}} title="Assign Gifts to Existing List">
        <p className="text-textPrimary">
          Assign gifts suggested for "<strong>{currentPendingSuggestion?.personName}</strong>" to which existing person?
        </p>
         <div className="mt-2">
            <h4 className="text-sm font-semibold text-textPrimary">Suggested Gifts:</h4>
            <ul className="text-xs list-disc list-inside pl-2 text-textSecondary max-h-32 overflow-y-auto">
                {currentPendingSuggestion?.gifts.map((gift, idx) => (
                    <li key={idx}>{gift.itemName}{gift.details ? ` (${gift.details})` : ''}</li>
                ))}
            </ul>
        </div>
        <Select
          label="Select existing person:"
          options={giftRecipientLists.map(list => ({ value: list.id, label: list.personName })).sort((a,b) => a.label.localeCompare(b.label))}
          value={listIdToAssignTo}
          onChange={e => setListIdToAssignTo(e.target.value)}
          containerClassName="my-4"
        />
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="ghost" onClick={() => {setIsAssignToListModalOpen(false); processNextPendingSuggestion();}}>Cancel</Button>
          <Button onClick={handleConfirmAssignToList} disabled={!listIdToAssignTo}>Assign Gifts</Button>
        </div>
      </Modal>

    </div>
  );
};


interface GiftItemDisplayProps {
  item: GiftItem;
  onEdit: () => void;
  onDelete: () => void;
}

const GiftItemDisplay: React.FC<GiftItemDisplayProps> = ({ item, onEdit, onDelete }) => {
  const statusColors: Record<GiftItemStatus, string> = {
    [GiftItemStatus.Idea]: 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200',
    [GiftItemStatus.Considered]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200',
    [GiftItemStatus.Purchased]: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200',
    [GiftItemStatus.Wrapped]: 'bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-200',
    [GiftItemStatus.Gifted]: 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  };

  return (
    <li className="p-3 bg-background dark:bg-gray-700 rounded-md shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex items-center">
            <h4 className="font-medium text-textPrimary">{item.itemName}</h4>
            {item.isNew && (
              <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-pink-500 text-white">New!</span>
            )}
          </div>
          {item.details && <p className="text-sm text-textSecondary mt-1">{item.details}</p>}
          {item.imageUrl && <img src={item.imageUrl} alt={item.itemName} className="mt-2 max-h-32 rounded" />}
           {item.tags && item.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-textSecondary rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center space-x-2 ml-2">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[item.status]}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit gift">
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete gift">
            <TrashIcon className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </li>
  );
};

interface GiftItemFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (itemData: ManualGiftItemData) => void; 
    existingItem: GiftItem | null;
}

const GiftItemFormModal: React.FC<GiftItemFormModalProps> = ({ isOpen, onClose, onSave, existingItem }) => {
    const [itemName, setItemName] = useState('');
    const [details, setDetails] = useState('');
    const [status, setStatus] = useState<GiftItemStatus>(GiftItemStatus.Idea);
    const [tagsString, setTagsString] = useState('');

    useEffect(() => {
        if (existingItem) {
            setItemName(existingItem.itemName);
            setDetails(existingItem.details || '');
            setStatus(existingItem.status);
            setTagsString(existingItem.tags ? existingItem.tags.join(', ') : '');
        } else {
            setItemName('');
            setDetails('');
            setStatus(GiftItemStatus.Idea);
            setTagsString('');
        }
    }, [existingItem, isOpen]);

    const handleSubmit = () => {
        if (!itemName.trim()) {
            alert('Item name is required.');
            return;
        }
        const parsedTags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
        const itemData: ManualGiftItemData = { 
            itemName: itemName.trim(), 
            details: details.trim(), 
            status, 
            tags: parsedTags,
        };
        onSave(itemData);
    };

    const statusOptions = Object.values(GiftItemStatus).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingItem ? 'Edit Gift Idea' : 'Add Gift Idea'}>
            <div className="space-y-4">
                <Input label="Item Name" value={itemName} onChange={e => setItemName(e.target.value)} required />
                <TextArea label="Details (Optional)" value={details} onChange={e => setDetails(e.target.value)} rows={3} />
                <Select label="Status" options={statusOptions} value={status} onChange={e => setStatus(e.target.value as GiftItemStatus)} />
                <Input 
                  label="Tags (Optional, comma-separated)" 
                  value={tagsString} 
                  onChange={e => setTagsString(e.target.value)} 
                  placeholder="e.g., book, outdoor, funny"
                />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>{existingItem ? 'Save Changes' : 'Add Item'}</Button>
            </div>
        </Modal>
    );
};


export default GiftAssistantPage;
