
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { PianoAnalysisResult, SavedPianoSong, UniqueChordDefinition as AIUniqueChordDefinition, ChordSimplificationOption, ChordProgressionItem, SavedUniqueChordDefinition } from '../../types';
import Button from '../../components/common/Button';
import TextArea from '../../components/common/TextArea';
import { PhotoIcon, CameraIcon, MusicNoteIcon, InformationCircleIcon, CheckCircleIcon } from '../../components/common/Icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertModal from '../../components/common/AlertModal';
import { geminiService } from '../../services/geminiService';
// Removed PianoChordVisualizer and SongGridView imports as they are no longer used here for interaction
import { generateChordVoicings, normalizeNoteToSharp, generateChordSimplifications, getChordAnalysisFromNotes, getNoteMidiValue } from './pianoHelper.utils';

// This interface matches the structure of SavedUniqueChordDefinition for consistency
// It represents what's being actively worked on in PianoHelperPage before saving
interface DisplayableChordInfo {
  chordName: string; // AI's original chord name
  aiSuggestedNotes: string[]; // AI's original notes for this chord name
  
  selectedSimplificationName: string;
  selectedVoicingIndex: number;

  simplificationOptions: ChordSimplificationOption[];
}


const PianoHelperPage: React.FC = () => {
  const { addSavedPianoSong } = useAppData();
  const [inputText, setInputText] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  const [rawAnalysisResult, setRawAnalysisResult] = useState<PianoAnalysisResult | null>(null);
  // displayableChords will hold the processed data ready for saving
  const [displayableChords, setDisplayableChords] = useState<DisplayableChordInfo[]>([]);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const processAndSetAnalysisResults = (analysis: PianoAnalysisResult | null) => {
    if (!analysis || !analysis.uniqueChords) {
      setDisplayableChords([]);
      setRawAnalysisResult(null);
      if (analysis === null && geminiService.getApiKeyStatus() !== 'valid') {
         openAlert("AI Error", "Failed to get analysis. Gemini API key might be missing or invalid. Please check settings.");
      } else if (analysis === null) {
         openAlert("AI Error", "Failed to get analysis from the AI service.");
      }
      return;
    }

    const processedChords: DisplayableChordInfo[] = analysis.uniqueChords.map(aiChord => {
      const normalizedAiNotes = aiChord.aiSuggestedNotes.map(normalizeNoteToSharp);
      
      const { voicings: originalVoicings, targetVoicingIndex: initialVoicingIdxForOriginal } = generateChordVoicings(
        aiChord.chordName, undefined, undefined, normalizedAiNotes, normalizedAiNotes 
      );
      const effectiveInitialVoicingIndex = initialVoicingIdxForOriginal !== -1 ? initialVoicingIdxForOriginal : 0;

      const originalOption: ChordSimplificationOption = {
        name: `Original (${aiChord.chordName})`,
        baseNotes: [...normalizedAiNotes].sort((a,b) => (getNoteMidiValue(a) ?? 0) - (getNoteMidiValue(b) ?? 0)),
        allVoicings: originalVoicings.length > 0 ? originalVoicings : (normalizedAiNotes.length > 0 ? [[...normalizedAiNotes]] : []),
        isOriginal: true,
        lastSelectedVoicingIndex: effectiveInitialVoicingIndex, 
      };
      
      const simplificationSteps = generateChordSimplifications(normalizedAiNotes);
      
      const allOptions = [originalOption, ...simplificationSteps.map(step => {
        const stepAnalysis = getChordAnalysisFromNotes(step.baseNotes);
        const { voicings: stepVoicings } = generateChordVoicings(stepAnalysis?.name || step.name, undefined, undefined, step.baseNotes);
        return {
          name: stepAnalysis ? stepAnalysis.name : step.name, 
          baseNotes: step.baseNotes,
          allVoicings: stepVoicings.length > 0 ? stepVoicings : (step.baseNotes.length > 0 ? [[...step.baseNotes]] : []),
          isOriginal: false,
          lastSelectedVoicingIndex: undefined, 
        };
      })].filter(opt => opt.allVoicings.length > 0);


      return {
        chordName: aiChord.chordName,
        aiSuggestedNotes: normalizedAiNotes,
        selectedSimplificationName: originalOption.name, 
        selectedVoicingIndex: effectiveInitialVoicingIndex,
        simplificationOptions: allOptions,
      };
    });

    setDisplayableChords(processedChords);
    setRawAnalysisResult(analysis);
  };


  const handleGenerateChords = async () => {
    if (!inputText && !uploadedImage) {
      openAlert("Input Required", "Please enter lyrics/chords or upload an image.");
      return;
    }
    setIsLoading(true);
    setRawAnalysisResult(null);
    setDisplayableChords([]);
    try {
      let analysis: PianoAnalysisResult | null = null;
      if (uploadedImage) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          analysis = await geminiService.generatePianoChords({ base64ImageData: base64Data, mimeType: uploadedImage.type });
          processAndSetAnalysisResults(analysis);
          setIsLoading(false);
        };
        reader.readAsDataURL(uploadedImage);
      } else {
        analysis = await geminiService.generatePianoChords({ text: inputText });
        processAndSetAnalysisResults(analysis);
        setIsLoading(false);
      }
    } catch (error: any) {
      openAlert("AI Error", `Failed to generate chords: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleSaveToSongbook = () => {
    if (!rawAnalysisResult || displayableChords.length === 0) {
      openAlert("Cannot Save", "No chord analysis result to save.");
      return;
    }
    setIsSaving(true);

    const savedUniqueChords: SavedUniqueChordDefinition[] = displayableChords.map(dc => ({
        chordName: dc.chordName,
        aiSuggestedNotes: dc.aiSuggestedNotes,
        selectedSimplificationName: dc.selectedSimplificationName,
        selectedVoicingIndex: dc.selectedVoicingIndex,
        simplificationOptions: dc.simplificationOptions.map(opt => ({
            name: opt.name,
            baseNotes: opt.baseNotes,
            allVoicings: opt.allVoicings,
            isOriginal: opt.isOriginal,
            lastSelectedVoicingIndex: opt.lastSelectedVoicingIndex 
        }))
    }));

    const songToSave: Omit<SavedPianoSong, 'id' | 'dateAdded'> = {
      songTitle: rawAnalysisResult.songTitle || "Untitled Song",
      lyricsBy: rawAnalysisResult.lyricsBy,
      musicBy: rawAnalysisResult.musicBy,
      sourceText: inputText || undefined,
      sourceImageBase64: uploadedImage && uploadedImagePreview ? uploadedImagePreview.split(',')[1] : undefined,
      sourceImageMimeType: uploadedImage?.type || undefined,
      analysisResult: {
        songTitle: rawAnalysisResult.songTitle, 
        lyricsBy: rawAnalysisResult.lyricsBy,
        musicBy: rawAnalysisResult.musicBy,
        uniqueChords: savedUniqueChords,
        chordProgression: rawAnalysisResult.chordProgression,
      }
    };

    try {
      addSavedPianoSong(songToSave);
      openAlert("Song Saved!", `"${songToSave.songTitle}" has been added to your songbook.`);
      // Clear inputs after saving
      setInputText('');
      setUploadedImage(null);
      setUploadedImagePreview(null);
      setRawAnalysisResult(null);
      setDisplayableChords([]);

    } catch (error: any) {
      openAlert("Save Error", `Could not save song: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  

  return (
    <div className="p-4 space-y-6 mb-16">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-2xl font-bold text-textPrimary flex items-center">
          <MusicNoteIcon className="w-7 h-7 mr-2 text-primary" /> Piano Chord Helper
        </h1>
        {rawAnalysisResult && (
            <Button 
              onClick={handleSaveToSongbook} 
              disabled={isLoading || isSaving} 
              size="sm"
              leftIcon={<CheckCircleIcon className="w-5 h-5"/>}
            >
              {isSaving ? "Saving..." : "Save to Songbook"}
            </Button>
        )}
      </div>

      <div className="bg-card p-4 rounded-lg shadow space-y-3">
        <TextArea
          label="Enter Lyrics & Chords or Describe Sheet Music:"
          value={inputText}
          onChange={e => { setInputText(e.target.value); setUploadedImage(null); setUploadedImagePreview(null); }}
          placeholder="Example: [C]Twinkle twinkle [G]little star..."
          rows={4}
          containerClassName="mb-0"
        />
        {uploadedImagePreview && (
          <div className="mt-2 text-center">
            <img src={uploadedImagePreview} alt="Uploaded preview" className="max-w-full max-h-40 mx-auto rounded border border-gray-300 dark:border-gray-600" />
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => imageInputRef.current?.click()} disabled={isLoading} leftIcon={<PhotoIcon className="w-5 h-5"/>}>
              Upload Image
            </Button>
            <Button variant="ghost" onClick={() => cameraInputRef.current?.click()} disabled={isLoading} leftIcon={<CameraIcon className="w-5 h-5"/>}>
              Take Photo
            </Button>
          </div>
          <Button onClick={handleGenerateChords} disabled={isLoading || (geminiService.getApiKeyStatus() !== 'valid')} className="w-full sm:w-auto">
            {isLoading ? <LoadingSpinner size="sm" /> : "Analyze with AI"}
          </Button>
        </div>
        <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleImageChange} />
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleImageChange} />
        {geminiService.getApiKeyStatus() !== 'valid' && 
             <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                <InformationCircleIcon className="w-3 h-3 inline mr-1"/>
                Gemini API key is not configured or invalid. AI features may not work. Check Settings.
            </p>
        }
      </div>

      {rawAnalysisResult && (
        <div className="bg-card p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-textPrimary mb-1">{rawAnalysisResult.songTitle || "Analysis Results"}</h2>
          <p className="text-xs text-textSecondary mb-1">
            {rawAnalysisResult.lyricsBy && <span>Lyrics by: {rawAnalysisResult.lyricsBy}</span>}
            {rawAnalysisResult.musicBy && <span className="ml-2">Music by: {rawAnalysisResult.musicBy}</span>}
          </p>
          
          {displayableChords.length > 0 && (
            <div className="mt-2">
                <h3 className="text-md font-semibold text-textPrimary mb-1">Identified Unique Chords:</h3>
                <ul className="list-disc list-inside text-sm text-textSecondary space-y-0.5">
                    {displayableChords.map(chord => (
                        <li key={chord.chordName}>{chord.chordName} (Original notes: {chord.aiSuggestedNotes.join(', ')})</li>
                    ))}
                </ul>
            </div>
          )}


          {rawAnalysisResult.chordProgression && rawAnalysisResult.chordProgression.length > 0 && (
            <div className="mt-3">
              <h3 className="text-md font-semibold text-textPrimary mb-1">Chord Progression:</h3>
              <div className="text-xs text-textSecondary bg-background dark:bg-gray-800 p-2 rounded max-h-40 overflow-y-auto">
                {rawAnalysisResult.chordProgression.map((item, index) => (
                  <span key={index} className="mr-2">
                    <span className="font-semibold text-primary">{item.chordName}</span>
                    {item.originalContext && <span className="text-xxs italic">({item.originalContext.substring(0, 20)}{item.originalContext.length > 20 ? '...' : ''})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertModal isOpen={alertInfo.isOpen} onClose={closeAlert} title={alertInfo.title} message={alertInfo.message} />
    </div>
  );
};

export default PianoHelperPage;
