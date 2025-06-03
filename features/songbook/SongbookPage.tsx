
import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { SavedPianoSong, ChordProgressionItem } from '../../types';
import Button from '../../components/common/Button';
import { TrashIcon, BookOpenIcon, ViewGridIcon, ViewListIcon, QueueListIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/common/Icons';
import PianoChordVisualizer from '../piano-helper/components/PianoChordVisualizer';
import SongGridView from '../piano-helper/components/SongGridView';
import SongProgressionView from './components/SongProgressionView';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { generateChordVoicings, normalizeNoteToSharp } from '../piano-helper/pianoHelper.utils';
import CollapsibleSection from '../../components/common/CollapsibleSection';

export interface DisplayableSongChordInfo {
  chordName: string;
  allPossibleVoicings: string[][];
  currentVoicingIndex: number;
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
  const { savedPianoSongs, deleteSavedPianoSong, updateSavedSongChordVoicing } = useAppData();

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean, songIdToDelete: string | null, songTitle: string | null }>({ isOpen: false, songIdToDelete: null, songTitle: null });

  const sortedSongs = useMemo(() =>
    [...savedPianoSongs].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()), // Sorted oldest to newest for book-like index
    [savedPianoSongs]
  );

  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(sortedSongs.length > 0 ? 0 : null);
  const [currentSongViewMode, setCurrentSongViewMode] = useState<SongbookViewMode>('details');
  const [interactiveSongChords, setInteractiveSongChords] = useState<Record<string, DisplayableSongChordInfo>>({});

  const currentSong = useMemo(() => {
    if (currentSongIndex !== null && sortedSongs[currentSongIndex]) {
      return sortedSongs[currentSongIndex];
    }
    return null;
  }, [currentSongIndex, sortedSongs]);

  useEffect(() => {
    if (currentSong) {
      const songChords: Record<string, DisplayableSongChordInfo> = {};
      currentSong.analysisResult.uniqueChords.forEach(savedChord => {
        const normalizedSelectedNotes = savedChord.selectedNotes.map(normalizeNoteToSharp);
        const allVoicings = generateChordVoicings(savedChord.chordName);
        let currentVoicingIdx = savedChord.selectedVoicingIndex;

        if (allVoicings.length > 0) {
          // Check if the saved index is valid and points to the correct notes
          if (currentVoicingIdx < 0 || currentVoicingIdx >= allVoicings.length || 
              JSON.stringify(allVoicings[currentVoicingIdx]?.sort()) !== JSON.stringify([...normalizedSelectedNotes].sort())) {
            // If not, try to find the correct index based on normalized notes
            const foundIdx = allVoicings.findIndex(v => JSON.stringify(v.sort()) === JSON.stringify([...normalizedSelectedNotes].sort()));
            currentVoicingIdx = foundIdx !== -1 ? foundIdx : 0; // Default to 0 if not found
          }
        } else {
          // If generateChordVoicings returns empty, use the (normalized) saved notes
          allVoicings.push([...normalizedSelectedNotes]);
          currentVoicingIdx = 0;
        }
        
        songChords[savedChord.chordName] = {
          chordName: savedChord.chordName,
          allPossibleVoicings: allVoicings,
          currentVoicingIndex: currentVoicingIdx,
        };
      });
      setInteractiveSongChords(songChords);
    } else {
      setInteractiveSongChords({});
    }
  }, [currentSong]); 


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

    setInteractiveSongChords(prevChords => {
      const chordToUpdate = prevChords[chordName];
      if (chordToUpdate && newIndex >= 0 && newIndex < chordToUpdate.allPossibleVoicings.length) {
        const updatedChordInfo = {
          ...chordToUpdate,
          currentVoicingIndex: newIndex,
        };
        const newSelectedNotes = updatedChordInfo.allPossibleVoicings[newIndex];
        // Notes should already be normalized when `allPossibleVoicings` were generated or processed
        updateSavedSongChordVoicing(currentSong.id, chordName, newSelectedNotes, newIndex);
        return { ...prevChords, [chordName]: updatedChordInfo };
      }
      return prevChords;
    });
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
                              chordName={chordInfo.chordName}
                              allVoicings={chordInfo.allPossibleVoicings}
                              currentVoicingIndex={chordInfo.currentVoicingIndex}
                              onVoicingChange={(newIndex) => handleSongChordVoicingChange(currentSong!.id, chordInfo.chordName, newIndex)}
                              // noteDotColors prop is NOT passed here, so visualizer will default to black dots
                            />
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
                      chords={interactiveSongChords}
                      onVoicingChange={handleSongChordVoicingChange}
                      songTitle={currentSong.songTitle}
                     />
                  )}

                  {currentSongViewMode === 'progression' && (
                    <SongProgressionView
                      song={currentSong}
                      interactiveChords={interactiveSongChords}
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
