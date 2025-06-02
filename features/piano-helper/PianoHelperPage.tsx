import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { PianoAnalysisResult, SavedPianoSong, UniqueChordDefinition as AIUniqueChordDefinition, SavedUniqueChordDefinition, ChordProgressionItem } from '../../types';
import Button from '../../components/common/Button';
import TextArea from '../../components/common/TextArea';
import { PhotoIcon, CameraIcon, MusicNoteIcon, InformationCircleIcon, CheckCircleIcon, ViewGridIcon, ViewListIcon } from '../../components/common/Icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertModal from '../../components/common/AlertModal';
import { geminiService } from '../../services/geminiService';
import PianoChordVisualizer from './components/PianoChordVisualizer';
import SongGridView, { SongGridChord } from './components/SongGridView'; // Import new components
import { generateChordVoicings } from './pianoHelper.utils';

interface DisplayableChordInfo {
  chordName: string;
  aiSuggestedNotes: string[]; 
  allPossibleVoicings: string[][]; 
  currentVoicingIndex: number;
}

const PianoHelperPage: React.FC = () => {
  const { addSavedPianoSong } = useAppData();
  const [inputText, setInputText] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  
  const [rawAnalysisResult, setRawAnalysisResult] = useState<PianoAnalysisResult | null>(null);
  const [displayableChords, setDisplayableChords] = useState<DisplayableChordInfo[]>([]);
  const [isGridViewActive, setIsGridViewActive] = useState<boolean>(false); // State for grid view

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const openAlert = (title: string, message: string) => setAlertInfo({ isOpen: true, title, message });
  const closeAlert = () => setAlertInfo({ isOpen: false, title: '', message: '' });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setUploadedImage(file);
      setInputText(''); 
      setRawAnalysisResult(null);
      setDisplayableChords([]);
      setIsGridViewActive(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearInputs = () => {
    setInputText('');
    setUploadedImage(null);
    setUploadedImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setRawAnalysisResult(null);
    setDisplayableChords([]);
    setIsGridViewActive(false);
  };
  
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
    if (event.target.value) {
        setUploadedImage(null); 
        setUploadedImagePreview(null);
        setRawAnalysisResult(null);
        setDisplayableChords([]);
        setIsGridViewActive(false);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() && !uploadedImage) {
      openAlert("Input Required", "Please enter lyrics/chords or upload an image of sheet music.");
      return;
    }

    setIsLoading(true);
    setRawAnalysisResult(null);
    setDisplayableChords([]);
    setIsGridViewActive(false);
    let currentAnalysis: PianoAnalysisResult | null = null;

    try {
      if (uploadedImage) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          currentAnalysis = await geminiService.generatePianoChords({
            base64ImageData: base64Data,
            mimeType: uploadedImage.type
          });
          processAIResults(currentAnalysis);
        };
        reader.readAsDataURL(uploadedImage);
      } else {
        currentAnalysis = await geminiService.generatePianoChords({ text: inputText });
        processAIResults(currentAnalysis);
      }
    } catch (error: any) {
      openAlert("AI Error", `Failed to get chord suggestions: ${error.message}`);
      setIsLoading(false);
    }
  };

  const processAIResults = (result: PianoAnalysisResult | null) => {
    if (result) {
      setRawAnalysisResult(result); 
      if (result.uniqueChords && result.uniqueChords.length > 0) {
        const newDisplayableChords = result.uniqueChords.map(aiChord => {
          const allVoicings = generateChordVoicings(aiChord.chordName);
          let initialIndex = 0;
          if (allVoicings.length > 0) {
            const foundIndex = allVoicings.findIndex(voicing => 
              JSON.stringify(voicing.sort()) === JSON.stringify([...aiChord.aiSuggestedNotes].sort())
            );
            if (foundIndex !== -1) {
              initialIndex = foundIndex;
            }
          } else {
            allVoicings.push([...aiChord.aiSuggestedNotes]);
          }
          
          return {
            chordName: aiChord.chordName,
            aiSuggestedNotes: aiChord.aiSuggestedNotes,
            allPossibleVoicings: allVoicings,
            currentVoicingIndex: initialIndex,
          };
        });
        setDisplayableChords(newDisplayableChords);
      } else {
        setDisplayableChords([]);
        openAlert("No Chords Found", "The AI could not identify any unique chords, though some metadata might be available.");
      }
    } else {
      openAlert("AI Response Error", "No valid analysis received from the AI or failed to parse the response.");
    }
    setIsLoading(false);
  };
  
  const handleVoicingChange = (chordNameToUpdate: string, newIndex: number) => {
    setDisplayableChords(prevChords => 
      prevChords.map(chord => 
        chord.chordName === chordNameToUpdate 
          ? { ...chord, currentVoicingIndex: newIndex } 
          : chord
      )
    );
  };

  const handleSaveSong = async () => {
    if (!rawAnalysisResult) { 
      openAlert("Error", "No analysis result to save.");
      return;
    }
    setIsSaving(true);

    const savedUniqueChords: SavedUniqueChordDefinition[] = displayableChords.map(dc => ({
      chordName: dc.chordName,
      selectedNotes: dc.allPossibleVoicings[dc.currentVoicingIndex] || dc.aiSuggestedNotes,
      selectedVoicingIndex: dc.currentVoicingIndex,
    }));

    const songToSave: Omit<SavedPianoSong, 'id' | 'dateAdded'> = {
      songTitle: rawAnalysisResult.songTitle || "Unknown Song",
      lyricsBy: rawAnalysisResult.lyricsBy,
      musicBy: rawAnalysisResult.musicBy,
      analysisResult: {
        songTitle: rawAnalysisResult.songTitle, 
        lyricsBy: rawAnalysisResult.lyricsBy,
        musicBy: rawAnalysisResult.musicBy,
        uniqueChords: savedUniqueChords,
        chordProgression: rawAnalysisResult.chordProgression || [],
      },
    };

    if (inputText) {
      songToSave.sourceText = inputText;
    } else if (uploadedImage && uploadedImagePreview) {
      if (uploadedImagePreview.startsWith('data:')) {
        songToSave.sourceImageBase64 = uploadedImagePreview.split(',')[1];
        songToSave.sourceImageMimeType = uploadedImage.type;
      } else { 
          const reader = new FileReader();
          reader.onloadend = () => {
              songToSave.sourceImageBase64 = (reader.result as string).split(',')[1];
              songToSave.sourceImageMimeType = uploadedImage.type;
              addSavedPianoSong(songToSave);
              openAlert("Song Saved", `"${songToSave.songTitle}" has been added to your Songbook.`);
              setIsSaving(false);
          }
          reader.readAsDataURL(uploadedImage);
          return; 
      }
    }
    
    addSavedPianoSong(songToSave);
    openAlert("Song Saved", `"${songToSave.songTitle}" has been added to your Songbook.`);
    setIsSaving(false);
  };

  const songGridData: SongGridChord[] = displayableChords.map(dc => ({
    chordName: dc.chordName,
    selectedNotes: dc.allPossibleVoicings[dc.currentVoicingIndex] || dc.aiSuggestedNotes,
  }));

  return (
    <div className="p-4 space-y-6 mb-16">
      <h1 className="text-2xl font-bold text-textPrimary flex items-center">
        <MusicNoteIcon className="w-7 h-7 mr-2 text-primary" /> Piano Chord Helper
      </h1>

      <div className="bg-card p-4 rounded-lg shadow space-y-4">
        <TextArea
          label="Enter Lyrics or Chords:"
          value={inputText}
          onChange={handleTextChange}
          rows={4}
          placeholder="e.g., Twinkle twinkle little star [C] [G] [Am] [F]..."
          containerClassName="mb-0"
          disabled={isLoading || isSaving}
        />
        <div className="text-center text-sm text-textSecondary my-2">OR</div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Button variant="ghost" onClick={() => imageInputRef.current?.click()} leftIcon={<PhotoIcon className="w-5 h-5" />} className="w-full sm:w-auto" disabled={isLoading || isSaving}>
            Upload Sheet Music
          </Button>
          <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleImageChange} disabled={isLoading || isSaving}/>
          <Button variant="ghost" onClick={() => cameraInputRef.current?.click()} leftIcon={<CameraIcon className="w-5 h-5" />} className="w-full sm:w-auto" disabled={isLoading || isSaving}>
            Take Photo of Music
          </Button>
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleImageChange} disabled={isLoading || isSaving}/>
        </div>

        {uploadedImagePreview && (
          <div className="mt-3 text-center">
            <p className="text-sm text-textSecondary mb-1">Image Preview:</p>
            <img src={uploadedImagePreview} alt="Uploaded sheet music preview" className="max-w-full max-h-60 mx-auto rounded border border-gray-300 dark:border-gray-600" />
          </div>
        )}
        
        <div className="flex gap-2 mt-3">
          <Button onClick={handleSubmit} disabled={isLoading || isSaving} className="flex-grow">
            {isLoading ? <LoadingSpinner size="sm" /> : "Generate Chords"}
          </Button>
          <Button onClick={clearInputs} variant="ghost" disabled={isLoading || isSaving}>Clear</Button>
        </div>
         {geminiService.getApiKeyStatus() !== 'valid' && 
             <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                <InformationCircleIcon className="w-3 h-3 inline mr-1"/>
                Gemini API key is not configured or invalid. AI features may not work. Check Settings.
            </p>
          }
      </div>

      {isLoading && <LoadingSpinner message="Finding chords with AI..." />}

      {rawAnalysisResult && !isLoading && (
        <div className="bg-card p-4 rounded-lg shadow space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-textPrimary">Analysis Result:</h2>
            {displayableChords && displayableChords.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGridViewActive(!isGridViewActive)}
                leftIcon={isGridViewActive ? <ViewListIcon className="w-5 h-5"/> : <ViewGridIcon className="w-5 h-5"/>}
              >
                {isGridViewActive ? "Detail View" : "Grid View"}
              </Button>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <p><strong>Title:</strong> {rawAnalysisResult.songTitle || 'N/A'}</p>
            {rawAnalysisResult.lyricsBy && <p><strong>Lyrics By:</strong> {rawAnalysisResult.lyricsBy}</p>}
            {rawAnalysisResult.musicBy && <p><strong>Music By:</strong> {rawAnalysisResult.musicBy}</p>}
          </div>

          {isGridViewActive ? (
            <SongGridView uniqueChords={songGridData} songTitle={rawAnalysisResult.songTitle} />
          ) : (
            <>
              {displayableChords && displayableChords.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-textPrimary mt-3">Unique Chords (Interactive):</h3>
                  {displayableChords.map((chordInfo) => (
                    <div key={`${chordInfo.chordName}-interactive-display`} className="p-3 bg-background dark:bg-gray-800 rounded-md">
                      <PianoChordVisualizer 
                        chordName={chordInfo.chordName} 
                        allVoicings={chordInfo.allPossibleVoicings}
                        currentVoicingIndex={chordInfo.currentVoicingIndex}
                        onVoicingChange={(newIndex) => handleVoicingChange(chordInfo.chordName, newIndex)}
                      />
                    </div>
                  ))}
                </>
              )}
            </>
          )}
          
          {rawAnalysisResult.chordProgression && rawAnalysisResult.chordProgression.length > 0 && (
             <div className="mt-4">
                <h3 className="text-lg font-semibold text-textPrimary">Chord Progression:</h3>
                <div className="mt-1 p-3 bg-background dark:bg-gray-800 rounded-md max-h-60 overflow-y-auto">
                    {rawAnalysisResult.chordProgression.map((progItem: ChordProgressionItem, index: number) => (
                        <p key={`prog-${index}`} className="text-sm text-textPrimary mb-1">
                           <span className="font-semibold">{progItem.chordName}</span>
                           {progItem.originalContext && <span className="text-xs text-textSecondary italic ml-2">"{progItem.originalContext}"</span>}
                        </p>
                    ))}
                </div>
             </div>
          )}

          {(!displayableChords || displayableChords.length === 0) && (!rawAnalysisResult.chordProgression || rawAnalysisResult.chordProgression.length === 0) && (
            <p className="text-textSecondary italic mt-2">No specific chords or progression were identified in this analysis.</p>
          )}

          <Button onClick={handleSaveSong} disabled={isSaving || isLoading} leftIcon={isSaving ? <LoadingSpinner size="sm"/> : <CheckCircleIcon className="w-5 h-5"/>} className="w-full mt-4">
            {isSaving ? "Saving..." : "Save to Songbook"}
          </Button>
        </div>
      )}
      
      {!rawAnalysisResult && !isLoading && (inputText || uploadedImagePreview) && (
          <p className="text-textSecondary text-center py-4">Click "Generate Chords" to see results.</p>
      )}

      <AlertModal
        isOpen={alertInfo.isOpen}
        onClose={closeAlert}
        title={alertInfo.title}
        message={alertInfo.message}
      />
    </div>
  );
};

export default PianoHelperPage;
