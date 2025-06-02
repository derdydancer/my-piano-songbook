import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { SavedPianoSong, SavedUniqueChordDefinition, ChordProgressionItem } from '../../types';
import Button from '../../components/common/Button';
import { TrashIcon, BookOpenIcon, ViewGridIcon, ViewListIcon, QueueListIcon } from '../../components/common/Icons'; 
import PianoChordVisualizer from '../piano-helper/components/PianoChordVisualizer';
import SongGridView, { SongGridChord } from '../piano-helper/components/SongGridView';
import SongProgressionView from './components/SongProgressionView'; 
import ConfirmationModal from '../../components/common/ConfirmationModal';
import CollapsibleSection from '../../components/common/CollapsibleSection'; 
import { generateChordVoicings } from '../piano-helper/pianoHelper.utils';

export interface DisplayableSongChordInfo { 
  chordName: string;
  allPossibleVoicings: string[][];
  currentVoicingIndex: number;
}

type SongbookViewMode = 'details' | 'grid' | 'progression';

const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaControls?: string;
}> = ({ label, icon, isActive, onClick, ariaControls }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    leftIcon={icon}
    className={`rounded-md px-3 py-1.5 text-xs sm:text-sm ${isActive ? 'bg-primary text-white dark:bg-primary dark:text-white shadow-sm' : 'text-textSecondary hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    aria-selected={isActive}
    aria-controls={ariaControls}
    role="tab"
  >
    {label}
  </Button>
);


const SongbookPage: React.FC = () => {
  const { savedPianoSongs, deleteSavedPianoSong, updateSavedSongChordVoicing } = useAppData(); 
  
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean, songIdToDelete: string | null, songTitle: string | null }>({ isOpen: false, songIdToDelete: null, songTitle: null });
  const [interactiveSongChords, setInteractiveSongChords] = useState<Record<string, Record<string, DisplayableSongChordInfo>>>({});
  const [activeSongViews, setActiveSongViews] = useState<Record<string, SongbookViewMode>>({});

  const openDeleteConfirm = (songId: string, songTitle: string) => {
    setConfirmDeleteModal({ isOpen: true, songIdToDelete: songId, songTitle });
  };

  const closeDeleteConfirm = () => {
    setConfirmDeleteModal({ isOpen: false, songIdToDelete: null, songTitle: null });
  };

  const handleDeleteConfirmed = () => {
    if (confirmDeleteModal.songIdToDelete) {
      deleteSavedPianoSong(confirmDeleteModal.songIdToDelete);
      setInteractiveSongChords(prev => {
        const newState = {...prev};
        delete newState[confirmDeleteModal.songIdToDelete!];
        return newState;
      });
      setActiveSongViews(prev => {
        const newState = {...prev};
        delete newState[confirmDeleteModal.songIdToDelete!];
        return newState;
      });
    }
    closeDeleteConfirm();
  };
  
  const sortedSongs = useMemo(() => 
    [...savedPianoSongs].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()),
    [savedPianoSongs]
  );

  const initializeInteractiveChordsForSong = (song: SavedPianoSong) => {
    if (!interactiveSongChords[song.id]) {
      const songChords: Record<string, DisplayableSongChordInfo> = {};
      song.analysisResult.uniqueChords.forEach(savedChord => {
        const allVoicings = generateChordVoicings(savedChord.chordName);
        let currentVoicingIdx = savedChord.selectedVoicingIndex;
        
        if (allVoicings.length > 0) {
            if (currentVoicingIdx < 0 || currentVoicingIdx >= allVoicings.length) {
                const foundIdx = allVoicings.findIndex(v => JSON.stringify(v.sort()) === JSON.stringify([...savedChord.selectedNotes].sort()));
                currentVoicingIdx = foundIdx !== -1 ? foundIdx : 0;
            }
        } else { 
            allVoicings.push([...savedChord.selectedNotes]);
            currentVoicingIdx = 0;
        }
        
        songChords[savedChord.chordName] = {
          chordName: savedChord.chordName,
          allPossibleVoicings: allVoicings,
          currentVoicingIndex: currentVoicingIdx,
        };
      });
      setInteractiveSongChords(prev => ({ ...prev, [song.id]: songChords }));
    }
    if (!activeSongViews[song.id]) {
        setActiveSongViews(prev => ({ ...prev, [song.id]: 'details' }));
    }
  };
  
  useEffect(() => {
    sortedSongs.forEach(song => {
        if (!activeSongViews[song.id]) {
            setActiveSongViews(prev => ({ ...prev, [song.id]: 'details' }));
        }
        // Ensure interactive chords are ready if not already
        if(!interactiveSongChords[song.id] && song.analysisResult.uniqueChords.length > 0) {
            initializeInteractiveChordsForSong(song);
        }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedSongs]); // Re-run if sortedSongs array reference changes (e.g. after delete)


  const handleSongChordVoicingChange = (songId: string, chordName: string, newIndex: number) => {
    setInteractiveSongChords(prevInteractive => {
      const songChords = prevInteractive[songId];
      if (songChords && songChords[chordName]) {
        const updatedChordInfo = {
          ...songChords[chordName],
          currentVoicingIndex: newIndex,
        };
        const newSelectedNotes = updatedChordInfo.allPossibleVoicings[newIndex];
        updateSavedSongChordVoicing(songId, chordName, newSelectedNotes, newIndex);
        return {
          ...prevInteractive,
          [songId]: { ...songChords, [chordName]: updatedChordInfo },
        };
      }
      return prevInteractive;
    });
  };

  const setSongViewMode = (songId: string, mode: SongbookViewMode) => {
    setActiveSongViews(prev => ({ ...prev, [songId]: mode }));
  };

  return (
    <div className="p-4 space-y-6 mb-16">
      <h1 className="text-2xl font-bold text-textPrimary flex items-center">
        <BookOpenIcon className="w-7 h-7 mr-2 text-primary" /> My Songbook
      </h1>

      {sortedSongs.length === 0 ? (
        <p className="text-center text-textSecondary py-10">
          Your songbook is empty. Add songs from the "Piano Chord Helper"!
        </p>
      ) : (
        <div className="space-y-3">
          {sortedSongs.map((song) => {
            const currentSongViewMode = activeSongViews[song.id] || 'details';
            const songGridData: SongGridChord[] = song.analysisResult.uniqueChords.map(uc => ({
                chordName: uc.chordName,
                selectedNotes: uc.selectedNotes,
            }));
            
            const songPanelId = `song-panel-${song.id}`;

            return (
              <CollapsibleSection 
                key={song.id} 
                title={song.songTitle || "Untitled Song"}
                onToggle={(isOpen) => { if (isOpen) initializeInteractiveChordsForSong(song); }}
                headerContent={
                    <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirm(song.id, song.songTitle || "Untitled Song"); }} 
                          aria-label={`Delete ${song.songTitle || "Untitled Song"}`}
                          leftIcon={<TrashIcon className="w-4 h-4 text-red-500"/>}
                        />
                    </div>
                }
              >
                <div className="space-y-3">
                  <div className="text-xs text-textSecondary mb-3">
                      Added: {new Date(song.dateAdded).toLocaleDateString()}
                      {song.analysisResult.lyricsBy && <span className="ml-2">Lyrics: {song.analysisResult.lyricsBy}</span>}
                      {song.analysisResult.musicBy && <span className="ml-2">Music: {song.analysisResult.musicBy}</span>}
                  </div>

                  {song.analysisResult.uniqueChords.length > 0 && (
                    <div role="tablist" aria-label={`Song views for ${song.songTitle || "Untitled Song"}`} className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                        <TabButton
                            label="Details"
                            icon={<ViewListIcon className="w-4 h-4 sm:w-5 sm:h-5"/>}
                            isActive={currentSongViewMode === 'details'}
                            onClick={() => setSongViewMode(song.id, 'details')}
                            ariaControls={`${songPanelId}-details`}
                        />
                        <TabButton
                            label="Grid"
                            icon={<ViewGridIcon className="w-4 h-4 sm:w-5 sm:h-5"/>}
                            isActive={currentSongViewMode === 'grid'}
                            onClick={() => setSongViewMode(song.id, 'grid')}
                             ariaControls={`${songPanelId}-grid`}
                        />
                        <TabButton
                            label="Progression"
                            icon={<QueueListIcon className="w-4 h-4 sm:w-5 sm:h-5"/>}
                            isActive={currentSongViewMode === 'progression'}
                            onClick={() => setSongViewMode(song.id, 'progression')}
                             ariaControls={`${songPanelId}-progression`}
                        />
                    </div>
                  )}

                  {song.sourceImageBase64 && song.sourceImageMimeType && (
                    <div className="my-2">
                      <h4 className="text-sm font-semibold text-textPrimary mb-1">Original Image:</h4>
                      <img 
                        src={`data:${song.sourceImageMimeType};base64,${song.sourceImageBase64}`} 
                        alt={`Sheet music for ${song.songTitle}`} 
                        className="max-w-full max-h-80 rounded border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  )}

                  {song.sourceText && (
                    <div className="my-2">
                      <h4 className="text-sm font-semibold text-textPrimary mb-1">Original Text:</h4>
                      <pre className="text-xs bg-background dark:bg-gray-800 p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">{song.sourceText}</pre>
                    </div>
                  )}
                  
                  {/* Tab Panel Content */}
                  <div id={`${songPanelId}-${currentSongViewMode}`} role="tabpanel" aria-labelledby={`tab-${song.id}-${currentSongViewMode}`}>
                    {currentSongViewMode === 'details' && interactiveSongChords[song.id] && (
                      <>
                        <h4 className="text-sm font-semibold text-textPrimary mt-2 mb-1">Unique Chords (Interactive):</h4>
                        {Object.values(interactiveSongChords[song.id]).length > 0 ? (
                          Object.values(interactiveSongChords[song.id]).map((chordInfo) => (
                             <div key={`${chordInfo.chordName}-interactive-${song.id}`} className="p-1 bg-background dark:bg-gray-800 rounded-md">
                                <PianoChordVisualizer 
                                    chordName={chordInfo.chordName} 
                                    allVoicings={chordInfo.allPossibleVoicings}
                                    currentVoicingIndex={chordInfo.currentVoicingIndex}
                                    onVoicingChange={(newIndex) => handleSongChordVoicingChange(song.id, chordInfo.chordName, newIndex)}
                                />
                            </div>
                          ))
                        ) : (
                          song.analysisResult.uniqueChords.length > 0 ?
                          <p className="text-sm text-textSecondary italic">Expand section fully to interact with chords.</p> :
                          <p className="text-sm text-textSecondary italic">No unique chords were saved for this song.</p>
                        )}
                         {song.analysisResult.chordProgression && song.analysisResult.chordProgression.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-semibold text-textPrimary mb-1">Chord Progression Summary:</h4>
                             <div className="mt-1 p-2 bg-background dark:bg-gray-800 rounded-md max-h-48 overflow-y-auto">
                                {song.analysisResult.chordProgression.map((progItem: ChordProgressionItem, index: number) => (
                                    <p key={`prog-summary-${song.id}-${index}`} className="text-xs text-textPrimary mb-0.5">
                                       <span className="font-semibold">{progItem.chordName}</span>
                                       {progItem.originalContext && <span className="text-xxs text-textSecondary italic ml-1">"{progItem.originalContext}"</span>}
                                    </p>
                                ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {currentSongViewMode === 'grid' && (
                      <SongGridView uniqueChords={songGridData} songTitle={song.songTitle}/>
                    )}

                    {currentSongViewMode === 'progression' && interactiveSongChords[song.id] && song.analysisResult.chordProgression && song.analysisResult.chordProgression.length > 0 && (
                      <SongProgressionView 
                          song={song} 
                          interactiveChords={interactiveSongChords[song.id]}
                          onVoicingChange={(chordName, newIndex) => handleSongChordVoicingChange(song.id, chordName, newIndex)}
                      />
                    )}
                     {currentSongViewMode === 'progression' && (!song.analysisResult.chordProgression || song.analysisResult.chordProgression.length === 0) && (
                        <p className="text-sm text-textSecondary italic text-center py-4">No chord progression data to display for this song.</p>
                     )}
                  </div>
                </div>
              </CollapsibleSection>
            )
          })}
        </div>
      )}

      {confirmDeleteModal.isOpen && (
        <ConfirmationModal
          isOpen={confirmDeleteModal.isOpen}
          onClose={closeDeleteConfirm}
          onConfirm={handleDeleteConfirmed}
          title={`Delete "${confirmDeleteModal.songTitle || 'this song'}"?`}
          message="Are you sure you want to remove this song from your songbook? This action cannot be undone."
          confirmText="Delete"
          confirmButtonVariant="danger"
        />
      )}
    </div>
  );
};

export default SongbookPage;