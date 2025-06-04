
import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { SavedPianoSong, ChordProgressionItem, SavedUniqueChordDefinition, ChordSimplificationOption } from '../../types';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select'; // Added import
import { TrashIcon, BookOpenIcon, ViewGridIcon, ViewListIcon, QueueListIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/common/Icons';
import PianoChordVisualizer from '../piano-helper/components/PianoChordVisualizer';
import SongGridView from './components/SongGridView';
import SongProgressionView from './components/SongProgressionView';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { generateChordVoicings, normalizeNoteToSharp } from '../piano-helper/pianoHelper.utils';
import CollapsibleSection from '../../components/common/CollapsibleSection';

// DisplayableSongChordInfo is mainly for the 'details' tab's PianoChordVisualizer and 'progression' tab
export interface DisplayableSongChordInfo {
  chordName: string; // Original AI chord name
  activeSimplificationName: string; // Name of the currently selected simplification
  allPossibleVoicings: string[][]; // Voicings of the CURRENTLY ACTIVE simplification/original
  currentVoicingIndex: number;
  simplificationOptions: ChordSimplificationOption[]; // All available simplification options
}

type SongbookViewMode = 'details' | 'grid' | 'progression';

interface SongIndexListProps {
  songs: SavedPianoSong[];
  currentSongId: string | null;
  onSelectSong: (songId: string) => void;
  className?: string;
}

const SongIndexList: React.FC<SongIndexListProps> = ({ songs, currentSongId, onSelectSong, className = '' }) => {
  if (songs.length === 0) {
    return null;
  }
  return (
    <nav aria-label="Song index" className={`bg-card p-2 rounded-lg shadow ${className}`}>
      <h3 className="text-md font-semibold text-textPrimary mb-2 px-1">Song Index</h3>
      <ul className="space-y-1">
        {songs.map((song, index) => (
          <li key={song.id}>
            <button
              onClick={() => onSelectSong(song.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors break-words
                ${song.id === currentSongId
                  ? 'bg-primary text-white font-semibold shadow-sm'
                  : 'text-textPrimary hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              aria-current={song.id === currentSongId ? 'page' : undefined}
            >
              {index + 1}. {song.songTitle || "Untitled Song"}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};


const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaControls?: string;
}> = ({ label, icon, isActive, onClick, ariaControls }) => (
  <Button
    variant={isActive ? 'primary' : 'ghost'}
    size="sm"
    onClick={onClick}
    leftIcon={icon}
    className={`
      rounded-md px-3 py-1.5 text-xs sm:text-sm
      ${isActive ? 'shadow-sm dark:!text-blue-950' : 'text-textSecondary hover:bg-gray-200 dark:hover:bg-gray-700'}
    `}
    aria-selected={isActive}
    aria-controls={ariaControls}
    role="tab"
  >
    {label}
  </Button>
);


const SongbookPage: React.FC = () => {
  const { savedPianoSongs, deleteSavedPianoSong, updateSavedSongChordVoicing, updateSavedSongChordSimplification } = useAppData();

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean, songIdToDelete: string | null, songTitle: string | null }>({ isOpen: false, songIdToDelete: null, songTitle: null });

  const sortedSongs = useMemo(() =>
    [...savedPianoSongs].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()), // Sorted oldest to newest for book-like index
    [savedPianoSongs]
  );

  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(sortedSongs.length > 0 ? 0 : null);
  const [currentSongViewMode, setCurrentSongViewMode] = useState<SongbookViewMode>('details');
  
  // This state derives the interactive chord data for the current song.
  // It's used by "Details" (PianoChordVisualizer) and "Progression" views.
  const interactiveSongChords = useMemo((): Record<string, DisplayableSongChordInfo> => {
    if (currentSongIndex === null || !sortedSongs[currentSongIndex]) {
      return {};
    }
    const song = sortedSongs[currentSongIndex];
    const songChordsMap: Record<string, DisplayableSongChordInfo> = {};

    song.analysisResult.uniqueChords.forEach(savedChord => {
      let activeSimplification = savedChord.simplificationOptions.find(
        opt => opt.name === savedChord.selectedSimplificationName
      );

      if (!activeSimplification) {
        console.warn(`Active simplification '${savedChord.selectedSimplificationName}' not found for chord '${savedChord.chordName}' in song '${song.songTitle}'. Defaulting to first valid option.`);
        activeSimplification = savedChord.simplificationOptions.find(opt => opt.allVoicings.length > 0) || 
                               (savedChord.simplificationOptions[0] ? savedChord.simplificationOptions[0] : { // Absolute fallback if no valid option
                                  name: `Original (${savedChord.chordName})`,
                                  baseNotes: savedChord.aiSuggestedNotes.map(normalizeNoteToSharp),
                                  allVoicings: generateChordVoicings(savedChord.chordName, undefined, undefined, savedChord.aiSuggestedNotes.map(normalizeNoteToSharp)).voicings,
                                  isOriginal: true,
                               } as ChordSimplificationOption); // Cast to ensure type compatibility if fallback structure is used
      }
       // Ensure at least one voicing, fallback to base notes if original & empty
      if (activeSimplification.allVoicings.length === 0 && activeSimplification.isOriginal && savedChord.aiSuggestedNotes.length > 0) {
        activeSimplification.allVoicings = [savedChord.aiSuggestedNotes.map(normalizeNoteToSharp)];
      }
      
      let effectiveVoicingIndex = savedChord.selectedVoicingIndex;
      if (activeSimplification.allVoicings.length === 0) {
         console.error(`No voicings for ${savedChord.chordName} with simplification ${activeSimplification.name}. Displaying empty.`);
         effectiveVoicingIndex = 0; // Or handle as error state
      } else if (effectiveVoicingIndex < 0 || effectiveVoicingIndex >= activeSimplification.allVoicings.length) {
        console.warn(`Invalid selectedVoicingIndex (${savedChord.selectedVoicingIndex}) for ${savedChord.chordName}. Defaulting to 0.`);
        effectiveVoicingIndex = 0;
      }
      
      songChordsMap[savedChord.chordName] = {
        chordName: savedChord.chordName, // Original AI name
        activeSimplificationName: activeSimplification.name,
        allPossibleVoicings: activeSimplification.allVoicings,
        currentVoicingIndex: effectiveVoicingIndex,
        simplificationOptions: savedChord.simplificationOptions,
      };
    });
    return songChordsMap;
  }, [currentSongIndex, sortedSongs]);


  const currentSong = useMemo(() => {
    if (currentSongIndex !== null && sortedSongs[currentSongIndex]) {
      return sortedSongs[currentSongIndex];
    }
    return null;
  }, [currentSongIndex, sortedSongs]);

  useEffect(() => {
    if (currentSongIndex !== null) {
        if (currentSongIndex >= sortedSongs.length && sortedSongs.length > 0) { 
            setCurrentSongIndex(sortedSongs.length - 1); 
        } else if (currentSongIndex < 0 && sortedSongs.length > 0) { 
            setCurrentSongIndex(0);
        } else if (sortedSongs.length === 0) {
             setCurrentSongIndex(null); 
        }
    } else if (sortedSongs.length > 0) {
        setCurrentSongIndex(0); 
    }
  }, [sortedSongs.length, currentSongIndex]);


  const openDeleteConfirm = (songId: string, songTitle: string) => {
    setConfirmDeleteModal({ isOpen: true, songIdToDelete: songId, songTitle });
  };

  const closeDeleteConfirm = () => {
    setConfirmDeleteModal({ isOpen: false, songIdToDelete: null, songTitle: null });
  };

  const handleDeleteConfirmed = () => {
    if (confirmDeleteModal.songIdToDelete) {
      const deletedSongIndex = sortedSongs.findIndex(s => s.id === confirmDeleteModal.songIdToDelete);
      deleteSavedPianoSong(confirmDeleteModal.songIdToDelete);
      if (sortedSongs.length -1 === 0) { 
          setCurrentSongIndex(null);
      } else if (deletedSongIndex === currentSongIndex) {
          if (deletedSongIndex === sortedSongs.length - 1) { 
              setCurrentSongIndex(Math.max(0, deletedSongIndex - 1));
          }
      } else if (deletedSongIndex < (currentSongIndex || 0)) {
          setCurrentSongIndex(prev => prev !== null ? prev -1 : null);
      }
    }
    closeDeleteConfirm();
  };

  const handleSongChordVoicingChange = (songId: string, chordName: string, newIndex: number) => {
    if (!currentSong || currentSong.id !== songId) {
        console.warn("Song ID mismatch or no current song in handleSongChordVoicingChange");
        return;
    }
    updateSavedSongChordVoicing(songId, chordName, newIndex);
  };
  
  const handleSongChordSimplificationChange = (songId: string, chordName: string, newSimplificationName: string) => {
    if (!currentSong || currentSong.id !== songId) {
        console.warn("Song ID mismatch or no current song in handleSongChordSimplificationChange");
        return;
    }
    updateSavedSongChordSimplification(songId, chordName, newSimplificationName);
    // No need to update local interactiveSongChords, it will re-derive from AppData change
  };


  const handleSongSelectionChange = (songId: string) => {
    const newIndex = sortedSongs.findIndex(s => s.id === songId);
    if (newIndex !== -1) {
      setCurrentSongIndex(newIndex);
      setCurrentSongViewMode('details'); 
    }
  };

  const handleNextSong = () => {
    if (currentSongIndex !== null && sortedSongs.length > 0) {
      setCurrentSongIndex((currentSongIndex + 1) % sortedSongs.length);
      setCurrentSongViewMode('details');
    }
  };

  const handlePreviousSong = () => {
    if (currentSongIndex !== null && sortedSongs.length > 0) {
      setCurrentSongIndex((currentSongIndex - 1 + sortedSongs.length) % sortedSongs.length);
      setCurrentSongViewMode('details');
    }
  };


  return (
    <div className="p-4 space-y-6 mb-28">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-2xl font-bold text-textPrimary flex items-center">
          <BookOpenIcon className="w-7 h-7 mr-2 text-primary" /> My Songbook
        </h1>
        {sortedSongs.length > 0 && currentSong && (
             <Button
                variant="danger"
                size="sm"
                onClick={() => openDeleteConfirm(currentSong.id, currentSong.songTitle || "Untitled Song")}
                aria-label={`Delete ${currentSong.songTitle || "Untitled Song"}`}
                leftIcon={<TrashIcon className="w-4 h-4"/>}
            >
                Delete Current Song
            </Button>
        )}
      </div>


      {sortedSongs.length === 0 ? (
        <p className="text-center text-textSecondary py-10">
          Your songbook is empty. Add songs from the "Piano Chord Helper"!
        </p>
      ) : (
        <div className="flex flex-col md:flex-row md:gap-4">
          <div className="w-full md:w-64 lg:w-72 md:flex-shrink-0 mb-4 md:mb-0 order-1 md:order-none md:sticky md:top-4 max-h-72 md:max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar">
            <SongIndexList
              songs={sortedSongs}
              currentSongId={currentSong?.id || null}
              onSelectSong={handleSongSelectionChange}
            />
          </div>

          <div className="flex-grow order-2 md:order-none min-w-0">
            {currentSong ? (
              <div className="bg-card p-4 rounded-lg shadow space-y-4">
                <h2 className="text-xl font-semibold text-textPrimary">{currentSong.songTitle || "Untitled Song"}</h2>
                <div className="text-xs text-textSecondary">
                    Added: {new Date(currentSong.dateAdded).toLocaleDateString()}
                    {currentSong.analysisResult.lyricsBy && <span className="ml-2">Lyrics: {currentSong.analysisResult.lyricsBy}</span>}
                    {currentSong.analysisResult.musicBy && <span className="ml-2">Music: {currentSong.analysisResult.musicBy}</span>}
                </div>

                {currentSong.analysisResult.uniqueChords.length > 0 && (
                  <div role="tablist" aria-label={`Song views for ${currentSong.songTitle || "Untitled Song"}`} className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                    <TabButton
                      label="Details"
                      icon={<ViewListIcon className="w-4 h-4 sm:w-5 sm:h-5"/>}
                      isActive={currentSongViewMode === 'details'}
                      onClick={() => setCurrentSongViewMode('details')}
                      ariaControls={`song-panel-${currentSong.id}-details`}
                    />
                    <TabButton
                      label="Grid"
                      icon={<ViewGridIcon className="w-4 h-4 sm:w-5 sm:h-5"/>}
                      isActive={currentSongViewMode === 'grid'}
                      onClick={() => setCurrentSongViewMode('grid')}
                      ariaControls={`song-panel-${currentSong.id}-grid`}
                    />
                    <TabButton
                      label="Progression"
                      icon={<QueueListIcon className="w-4 h-4 sm:w-5 sm:h-5"/>}
                      isActive={currentSongViewMode === 'progression'}
                      onClick={() => setCurrentSongViewMode('progression')}
                      ariaControls={`song-panel-${currentSong.id}-progression`}
                    />
                  </div>
                )}

                {currentSong.sourceImageBase64 && currentSong.sourceImageMimeType && (
                  <CollapsibleSection title="Original Image" initialOpen={false}>
                    <img
                      src={`data:${currentSong.sourceImageMimeType};base64,${currentSong.sourceImageBase64}`}
                      alt={`Sheet music for ${currentSong.songTitle}`}
                      className="max-w-full max-h-96 rounded border border-gray-300 dark:border-gray-600 mx-auto"
                    />
                  </CollapsibleSection>
                )}

                {currentSong.sourceText && (
                   <CollapsibleSection title="Original Text" initialOpen={false}>
                    <pre className="text-xs bg-background dark:bg-gray-800 p-2 rounded whitespace-pre-wrap max-h-60 overflow-y-auto">{currentSong.sourceText}</pre>
                  </CollapsibleSection>
                )}

                <div id={`song-panel-${currentSong.id}-${currentSongViewMode}`} role="tabpanel">
                  {currentSongViewMode === 'details' && (
                    <>
                      <h4 className="text-sm font-semibold text-textPrimary mt-2 mb-1">Unique Chords (Interactive):</h4>
                      {Object.values(interactiveSongChords).length > 0 ? (
                        Object.values(interactiveSongChords).map((chordInfo) => (
                          <div key={`${chordInfo.chordName}-interactive-${currentSong.id}`} className="p-1 bg-background dark:bg-gray-800 rounded-md mb-1">
                            <PianoChordVisualizer
                              chordName={chordInfo.activeSimplificationName} // Show name of current simplification
                              allVoicings={chordInfo.allPossibleVoicings}
                              currentVoicingIndex={chordInfo.currentVoicingIndex}
                              onVoicingChange={(newIndex) => handleSongChordVoicingChange(currentSong!.id, chordInfo.chordName, newIndex)}
                            />
                             {chordInfo.simplificationOptions.length > 1 && (
                                <Select
                                    options={chordInfo.simplificationOptions.map(opt => ({value: opt.name, label: opt.name}))}
                                    value={chordInfo.activeSimplificationName}
                                    onChange={(e) => handleSongChordSimplificationChange(currentSong!.id, chordInfo.chordName, e.target.value)}
                                    className="text-xs p-1 mt-1 w-full"
                                    containerClassName="mb-0"
                                    aria-label={`Simplification for ${chordInfo.chordName}`}
                                />
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-textSecondary italic">No unique chords were saved for this song.</p>
                      )}
                      {currentSong.analysisResult.chordProgression && currentSong.analysisResult.chordProgression.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-semibold text-textPrimary mb-1">Chord Progression Summary:</h4>
                          <div className="mt-1 p-2 bg-background dark:bg-gray-800 rounded-md max-h-48 overflow-y-auto">
                            {currentSong.analysisResult.chordProgression.map((progItem: ChordProgressionItem, index: number) => (
                              <p key={`prog-summary-${currentSong!.id}-${index}`} className="text-xs text-textPrimary mb-0.5">
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
                    <SongGridView
                      songId={currentSong.id}
                      uniqueChordsData={currentSong.analysisResult.uniqueChords} // Pass full SavedUniqueChordDefinition
                      onVoicingChange={handleSongChordVoicingChange}
                      onSimplificationChange={handleSongChordSimplificationChange} // Pass new handler
                      songTitle={currentSong.songTitle}
                     />
                  )}

                  {currentSongViewMode === 'progression' && (
                    <SongProgressionView
                      song={currentSong}
                      interactiveChords={interactiveSongChords} // Progression view uses the derived interactive state
                      onVoicingChange={(chordName, newIndex) => handleSongChordVoicingChange(currentSong!.id, chordName, newIndex)}
                    />
                  )}
                </div>
              </div>
            ) : (
                 <p className="text-center text-textSecondary py-10">
                    Select a song from the index to view its details.
                 </p>
            )}
          </div>
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

      {sortedSongs.length > 1 && (
        <div className="fixed bottom-16 left-0 right-0 p-2 bg-card/80 dark:bg-gray-700/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-600 flex justify-center items-center space-x-4 z-10">
            <Button onClick={handlePreviousSong} leftIcon={<ChevronLeftIcon className="w-5 h-5"/>} aria-label="Previous Song">
                Previous
            </Button>
            <span className="text-sm text-textSecondary">
                {currentSongIndex !== null ? currentSongIndex + 1 : '-'}/{sortedSongs.length}
            </span>
            <Button onClick={handleNextSong} rightIcon={<ChevronRightIcon className="w-5 h-5"/>} aria-label="Next Song">
                Next
            </Button>
        </div>
      )}
    </div>
  );
};

export default SongbookPage;