import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SavedPianoSong } from '../../../types';
import { DisplayableSongChordInfo } from '../SongbookPage';
import { normalizeNoteToSharp, getNoteMidiValue, MIDI_NOTE_NAMES_SHARP, getNoteFromMidiValue } from '../../piano-helper/pianoHelper.utils';
import Button from '../../../components/common/Button';
import { PlayIcon as ReplayIcon, ChevronRightIcon, XMarkIcon, SettingsIcon } from '../../../components/common/Icons';
import { useAppData } from '../../../contexts/AppDataContext';
import PlayAlongSettingsPanel from './PlayAlongSettingsPanel';
import { detect as detectChord } from '@tonaljs/chord-detect';

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 600; // This will be overall SVG height, keyboard area will be calculated.

const LYRICS_AREA_HEIGHT_FIXED = 80; // Fixed height for lyrics area
const CONTROLS_AREA_HEIGHT_FIXED = 200; // Fixed height for controls (slider was moved)

// Geometric constants - these are hardcoded for visual stability
const GEOMETRIC_CONSTANTS = {
  farYFactor: 0.3, // Factor of keyboard area height
  nearYFactor: 0.8, // Factor of keyboard area height
  playAreaVisibleHeightFactor: 0.2, // Factor of keyboard area height
  vanishingPointXFactor: 0.5, // Factor of VIEWBOX_WIDTH
  vanishingPointYFactor: -0.9, // Factor of keyboard area height (negative, above keyboard)
  horizonNarrowingFactor: 0.55,
  blackKeyWidthFactor: 0.6,
  blackKeyRelDepthFactor: 0, // Not used in current geometry
  blackKeyFrontFaceHeightFactor: 0.6,
  playedChordFadeDuration: 1500,
  dotYFactorWhite: 0.75,
  dotYFactorBlack: 0.5,
};

const OCTAVES_TO_DISPLAY = 4;
const START_OCTAVE = 2;

const projectX = (sourceX: number, sourceY: number, targetY: number, vpX: number, vpY: number): number => {
  if (sourceY === vpY) return sourceX;
  if (sourceY === targetY) return sourceX;
  const t = (targetY - vpY) / (sourceY - vpY);
  return vpX + (sourceX - vpX) * t;
};

interface PerspectiveKeyRenderData {
  id: string;
  noteFullName: string;
  isBlack: boolean;
  topSurfacePoints: string;
  frontFacePoints?: string;
  nearLeftX: number;
  nearRightX: number;
  farLeftX: number;
  farRightX: number;
  keyNearYActual: number;
  keyFarYVisual: number;
  playAreaFrontFaceMidX: number;
  playAreaFrontFaceHeight: number;
}

interface PerspectiveKeyRendererProps extends PerspectiveKeyRenderData {
  isPlayAreaHighlightedForFadeOut: boolean;
  fadeOutOpacity: number;
  whiteKeyColor: string;
  blackKeyColor: string;
  keyStrokeColor: string;
  playedChordHighlightColor: string;
}

const PerspectiveKeyRendererComponent: React.FC<PerspectiveKeyRendererProps> = ({
  id, isBlack, topSurfacePoints, frontFacePoints,
  isPlayAreaHighlightedForFadeOut, fadeOutOpacity,
  whiteKeyColor, blackKeyColor, keyStrokeColor, playedChordHighlightColor
}) => {
  const baseFill = isBlack ? blackKeyColor : whiteKeyColor;

  return (
    <g id={id}>
      <polygon
        points={topSurfacePoints}
        fill={baseFill}
        stroke={keyStrokeColor}
        strokeWidth="1.0"
      />
      {frontFacePoints && (
        <>
          <polygon
            points={frontFacePoints}
            fill={baseFill}
            stroke={keyStrokeColor}
            strokeWidth="0.5"
          />
          {isPlayAreaHighlightedForFadeOut && fadeOutOpacity > 0 && (
            <polygon
              points={frontFacePoints}
              fill={playedChordHighlightColor}
              opacity={fadeOutOpacity}
              stroke="none"
            />
          )}
        </>
      )}
    </g>
  );
};
const PerspectiveKeyRenderer = React.memo<PerspectiveKeyRendererProps>(PerspectiveKeyRendererComponent);


interface PlayAlongViewProps {
  song: SavedPianoSong;
  interactiveChords: Record<string, DisplayableSongChordInfo>;
  onExit: () => void;
}

const PlayAlongView: React.FC<PlayAlongViewProps> = ({ song, interactiveChords, onExit }) => {
  const { playAlongSettings } = useAppData();
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  const [currentProgressionIndex, setCurrentProgressionIndex] = useState<number>(-1);
  const [upcomingChordYPos, setUpcomingChordYPos] = useState<number>(0); // Initialized by effect
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const [playedChordNotes, setPlayedChordNotes] = useState<string[]>([]);
  const [playedChordFadeOutOpacity, setPlayedChordFadeOutOpacity] = useState<number>(0);
  const [upcomingNotesForPlayAreaDots, setUpcomingNotesForPlayAreaDots] = useState<string[]>([]);

  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const { chordProgression } = song.analysisResult;

  // Derived layout values based on fixed heights
  const keyboardAreaHeight = VIEWBOX_HEIGHT - LYRICS_AREA_HEIGHT_FIXED - CONTROLS_AREA_HEIGHT_FIXED;
  const keyboardAreaYStart = playAlongSettings.lyricsPosition === 'top' ? LYRICS_AREA_HEIGHT_FIXED : 0;
  const controlsAreaYStart = playAlongSettings.lyricsPosition === 'top' 
    ? LYRICS_AREA_HEIGHT_FIXED + keyboardAreaHeight 
    : keyboardAreaHeight;
  const lyricsAreaYStart = playAlongSettings.lyricsPosition === 'top' ? 0 : keyboardAreaHeight + CONTROLS_AREA_HEIGHT_FIXED;

  // Perspective settings using GEOMETRIC_CONSTANTS and dynamic keyboardAreaHeight
  const currentPerspectiveSettings = useMemo(() => {
    const farY = keyboardAreaHeight * GEOMETRIC_CONSTANTS.farYFactor;
    const nearY = keyboardAreaHeight * GEOMETRIC_CONSTANTS.nearYFactor;
    return {
      farY,
      nearY,
      playAreaVisibleHeight: keyboardAreaHeight * GEOMETRIC_CONSTANTS.playAreaVisibleHeightFactor,
      vanishingPointX: VIEWBOX_WIDTH * GEOMETRIC_CONSTANTS.vanishingPointXFactor,
      vanishingPointY: keyboardAreaHeight * GEOMETRIC_CONSTANTS.vanishingPointYFactor,
    };
  }, [keyboardAreaHeight]);
  
  useEffect(() => {
    setUpcomingChordYPos(currentPerspectiveSettings.farY); // Start position for upcoming chord
  }, [currentPerspectiveSettings.farY]);


  const upcomingChordDisplayIndex = currentProgressionIndex + 1;
  const upcomingChordProgItem = chordProgression && upcomingChordDisplayIndex < chordProgression.length ? chordProgression[upcomingChordDisplayIndex] : null;
  const upcomingChordInfo = upcomingChordProgItem ? interactiveChords[upcomingChordProgItem.chordName] : null;

  const upcomingChordNotesForHighwayAndDots = useMemo(() =>
    (upcomingChordInfo?.allPossibleVoicings[upcomingChordInfo.currentVoicingIndex] || []).map(normalizeNoteToSharp),
    [upcomingChordInfo]
  );

  const perspectiveKeys = useMemo((): PerspectiveKeyRenderData[] => {
    const keys: PerspectiveKeyRenderData[] = [];
    let currentXAtNearWhite = 0;
    const whiteKeyDatas: Omit<PerspectiveKeyRenderData, 'topSurfacePoints' | 'frontFacePoints' | 'farLeftX' | 'farRightX'>[] = [];

    const { farY, nearY, vanishingPointX, vanishingPointY, playAreaVisibleHeight } = currentPerspectiveSettings;
    const narrowingFactor = GEOMETRIC_CONSTANTS.horizonNarrowingFactor;

    for (let oct = START_OCTAVE; oct < START_OCTAVE + OCTAVES_TO_DISPLAY; oct++) {
      MIDI_NOTE_NAMES_SHARP.forEach((noteNamePart) => {
        if (noteNamePart.includes('#')) return;
        const noteFullName = `${noteNamePart}${oct}`;
        const keyId = `${noteFullName}-perspective`;
        const nearLeftX = currentXAtNearWhite;
        const nearRightX = currentXAtNearWhite + playAlongSettings.baseWhiteKeyWidth;
        whiteKeyDatas.push({
            id: keyId, noteFullName, isBlack: false,
            nearLeftX, nearRightX,
            keyNearYActual: nearY,
            keyFarYVisual: farY,
            playAreaFrontFaceMidX: 0, playAreaFrontFaceHeight: 0,
        });
        currentXAtNearWhite += playAlongSettings.baseWhiteKeyWidth;
      });
    }

    const totalKeyboardWidthAtNear = currentXAtNearWhite;
    const xOffsetNear = (VIEWBOX_WIDTH - totalKeyboardWidthAtNear) / 2;

    whiteKeyDatas.forEach(wkDataInput => {
        const wkData = {...wkDataInput};
        wkData.nearLeftX += xOffsetNear;
        wkData.nearRightX += xOffsetNear;

        const unNarrowedFarLeftX = projectX(wkData.nearLeftX, nearY, farY, vanishingPointX, vanishingPointY);
        const unNarrowedFarRightX = projectX(wkData.nearRightX, nearY, farY, vanishingPointX, vanishingPointY);

        const farLeftX_narrowed = vanishingPointX + (unNarrowedFarLeftX - vanishingPointX) * (1 - narrowingFactor);
        const farRightX_narrowed = vanishingPointX + (unNarrowedFarRightX - vanishingPointX) * (1 - narrowingFactor);

        const topSurfacePoints = `${wkData.nearLeftX},${nearY} ${wkData.nearRightX},${nearY} ${farRightX_narrowed},${farY} ${farLeftX_narrowed},${farY}`;
        const frontFaceYEnd = nearY + playAreaVisibleHeight;
        const frontFacePoints = `${wkData.nearLeftX},${nearY} ${wkData.nearRightX},${nearY} ${wkData.nearRightX},${frontFaceYEnd} ${wkData.nearLeftX},${frontFaceYEnd}`;

        keys.push({
            ...wkData,
            farLeftX: farLeftX_narrowed,
            farRightX: farRightX_narrowed,
            topSurfacePoints,
            frontFacePoints,
            playAreaFrontFaceMidX: (wkData.nearLeftX + wkData.nearRightX) / 2,
            playAreaFrontFaceHeight: playAreaVisibleHeight,
        });
    });

    keys.filter(k => !k.isBlack).forEach(wkData => {
        const whiteNoteNameOnly = wkData.noteFullName.slice(0, -1);
        const octave = parseInt(wkData.noteFullName.slice(-1));
        if (["C","D","F","G","A"].includes(whiteNoteNameOnly)) {
            const blackNoteFullName = `${whiteNoteNameOnly}#${octave}`;
            const blackKeyId = `${blackNoteFullName}-perspective`;
            const blackWidthAtNear = playAlongSettings.baseWhiteKeyWidth * GEOMETRIC_CONSTANTS.blackKeyWidthFactor;
            const blackKeyTopSurfaceActualNearY = nearY;

            const blackNearLeftX_top = wkData.nearRightX - blackWidthAtNear / 2;
            const blackNearRightX_top = wkData.nearRightX + blackWidthAtNear / 2;

            const unNarrowedBlackFarLeftX = projectX(blackNearLeftX_top, blackKeyTopSurfaceActualNearY, farY, vanishingPointX, vanishingPointY);
            const unNarrowedBlackFarRightX = projectX(blackNearRightX_top, blackKeyTopSurfaceActualNearY, farY, vanishingPointX, vanishingPointY);

            const blackFarLeftX_narrowed = vanishingPointX + (unNarrowedBlackFarLeftX - vanishingPointX) * (1 - narrowingFactor);
            const blackFarRightX_narrowed = vanishingPointX + (unNarrowedBlackFarRightX - vanishingPointX) * (1 - narrowingFactor);

            const topSurfacePoints = `${blackNearLeftX_top},${blackKeyTopSurfaceActualNearY} ${blackNearRightX_top},${blackKeyTopSurfaceActualNearY} ${blackFarRightX_narrowed},${farY} ${blackFarLeftX_narrowed},${farY}`;

            const blackPlayAreaFrontFaceHeight = playAreaVisibleHeight * GEOMETRIC_CONSTANTS.blackKeyFrontFaceHeightFactor;
            const blackFrontFaceYEnd = nearY + blackPlayAreaFrontFaceHeight;
            const frontFacePoints = `${blackNearLeftX_top},${nearY} ${blackNearRightX_top},${nearY} ${blackNearRightX_top},${blackFrontFaceYEnd} ${blackNearLeftX_top},${blackFrontFaceYEnd}`;

            keys.push({
                id: blackKeyId, noteFullName: blackNoteFullName, isBlack: true, topSurfacePoints, frontFacePoints,
                nearLeftX: blackNearLeftX_top,
                nearRightX: blackNearRightX_top,
                farLeftX: blackFarLeftX_narrowed,
                farRightX: blackFarRightX_narrowed,
                keyNearYActual: blackKeyTopSurfaceActualNearY,
                keyFarYVisual: farY,
                playAreaFrontFaceMidX: (blackNearLeftX_top + blackNearRightX_top) / 2,
                playAreaFrontFaceHeight: blackPlayAreaFrontFaceHeight,
            });
        }
    });
    return keys.sort((a,b) => (a.isBlack ? 1:0) - (b.isBlack ? 1:0));
  }, [playAlongSettings.baseWhiteKeyWidth, currentPerspectiveSettings]);

  const animateUpcomingChord = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const deltaTime = (timestamp - lastTimeRef.current);
    const { farY, nearY } = currentPerspectiveSettings;

    if (upcomingChordProgItem && !isFinished) {
      setUpcomingChordYPos(prevY => {
        const targetY = nearY;
        const distanceToTarget = targetY - prevY;
        const totalDistance = nearY - farY;

        let speedFactor = Math.pow(Math.max(0.05, distanceToTarget / totalDistance), 0.7);
        speedFactor = Math.min(1.0, speedFactor + 0.1);

        const baseSpeed = keyboardAreaHeight * 0.7 / 1000;
        let speed = baseSpeed * speedFactor * playAlongSettings.animationSpeedFactor;

        let nextY = prevY + speed * deltaTime;
        const hoverPoint = nearY;
        if (nextY >= hoverPoint) {
          nextY = hoverPoint;
        }
        return nextY;
      });
    }

    if (playedChordFadeOutOpacity > 0) {
      setPlayedChordFadeOutOpacity(prevOpacity => {
        const decrement = deltaTime / GEOMETRIC_CONSTANTS.playedChordFadeDuration;
        return Math.max(0, prevOpacity - decrement);
      });
    }

    lastTimeRef.current = timestamp;
    animationFrameRef.current = requestAnimationFrame(animateUpcomingChord);
  }, [upcomingChordProgItem, isFinished, playedChordFadeOutOpacity, playAlongSettings.animationSpeedFactor, currentPerspectiveSettings, keyboardAreaHeight]);

  useEffect(() => {
    if (!isFinished) {
        lastTimeRef.current = 0;
        animationFrameRef.current = requestAnimationFrame(animateUpcomingChord);
    } else {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isFinished, animateUpcomingChord]);

  useEffect(() => {
    if (currentProgressionIndex === -1 && chordProgression && chordProgression.length > 0) {
      const firstChordItem = chordProgression[0];
      const firstChordInfo = interactiveChords[firstChordItem.chordName];
      const initialDots = (firstChordInfo?.allPossibleVoicings[firstChordInfo.currentVoicingIndex] || []).map(normalizeNoteToSharp);
      setUpcomingNotesForPlayAreaDots(initialDots);
    } else if (isFinished || !upcomingChordProgItem) {
      setUpcomingNotesForPlayAreaDots([]);
    }
  }, [currentProgressionIndex, isFinished, upcomingChordProgItem, chordProgression, interactiveChords]);


  const handlePlayNextChord = useCallback(() => {
    if (isFinished) {
      setCurrentProgressionIndex(-1);
      setIsFinished(false);
      setPlayedChordNotes([]);
      setPlayedChordFadeOutOpacity(0);
      setUpcomingChordYPos(currentPerspectiveSettings.farY);
      return;
    }

    const newCurrentProgressionIndex = upcomingChordDisplayIndex;
    if (!chordProgression || newCurrentProgressionIndex >= chordProgression.length) return;

    const currentChordToPlayItem = chordProgression[newCurrentProgressionIndex];
    const currentChordToPlayInfo = interactiveChords[currentChordToPlayItem.chordName];
    if (currentChordToPlayInfo) {
      setPlayedChordNotes(currentChordToPlayInfo.allPossibleVoicings[currentChordToPlayInfo.currentVoicingIndex].map(normalizeNoteToSharp));
      setPlayedChordFadeOutOpacity(1);
    } else {
      setPlayedChordNotes([]);
      setPlayedChordFadeOutOpacity(0);
    }

    setCurrentProgressionIndex(newCurrentProgressionIndex);

    const nextUpcomingChordIndexAfterThisPlay = newCurrentProgressionIndex + 1;
    if (nextUpcomingChordIndexAfterThisPlay >= chordProgression.length) {
      setIsFinished(true);
      setUpcomingNotesForPlayAreaDots([]);
      setUpcomingChordYPos(currentPerspectiveSettings.nearY + 100);
    } else {
      setUpcomingChordYPos(currentPerspectiveSettings.farY);
      const notesForNewDotsProgItem = chordProgression[nextUpcomingChordIndexAfterThisPlay];
      const notesForNewDotsInfo = notesForNewDotsProgItem ? interactiveChords[notesForNewDotsProgItem.chordName] : null;
      const newNotesForDots = (notesForNewDotsInfo?.allPossibleVoicings[notesForNewDotsInfo.currentVoicingIndex] || []).map(normalizeNoteToSharp);
      setUpcomingNotesForPlayAreaDots(newNotesForDots);
    }
  }, [isFinished, chordProgression, upcomingChordDisplayIndex, interactiveChords, currentPerspectiveSettings]);

  // --- Chord listening state ---
  const [listening, setListening] = useState<boolean>(true);
  const midiInputRef = useRef<WebMidi.MIDIInput | null>(null);
  const playedNotesRef = useRef<Set<string>>(new Set());
  const listenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Chord listening effect ---
  useEffect(() => {
    if (!listening || !upcomingChordInfo) return;

    let midiAccess: WebMidi.MIDIAccess | null = null;

    function noteNameFromMidi(midi: number) {
      // Convert midi number to note name (e.g. 60 -> "C4")
      const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const note = NOTE_NAMES[midi % 12];
      const octave = Math.floor(midi / 12) - 1;
      return `${note}${octave}`;
    }

    function handleMidiMessage(event: WebMidi.MIDIMessageEvent) {
      if (event.data[0] === 0x90 && event.data[2] > 0) {
        // Note on
        playedNotesRef.current.add(noteNameFromMidi(event.data[1]));
      } else if (event.data[0] === 0x80 || (event.data[0] === 0x90 && event.data[2] === 0)) {
        // Note off
        playedNotesRef.current.delete(noteNameFromMidi(event.data[1]));
      }
      // Debounce: check after a short delay
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = setTimeout(checkForChord, 120);
    }

    function checkForChord() {
      const notes = Array.from(playedNotesRef.current);
      if (notes.length === 0) return;
      // Use tonaljs chord-detect to recognize chord
      const detected = detectChord(notes);
      const upcomingChordNames = [
        upcomingChordInfo.chordName,
        ...(upcomingChordInfo.allSimplificationNames || []),
        ...(upcomingChordInfo.allPossibleVoicingNames || [])
      ].map(n => n.toLowerCase());
      if (
        detected.some(detectedName =>
          upcomingChordNames.some(
            chordName => detectedName.toLowerCase().replace(/\s+/g, '') === chordName.replace(/\s+/g, '')
          )
        )
      ) {
        handlePlayNextChord();
        playedNotesRef.current.clear();
      }
    }

    async function setupMidi() {
      try {
        midiAccess = await navigator.requestMIDIAccess();
        for (const input of midiAccess.inputs.values()) {
          input.addEventListener('midimessage', handleMidiMessage);
          midiInputRef.current = input;
          break;
        }
      } catch (e) {
        // MIDI not available
      }
    }

    setupMidi();

    return () => {
      if (midiInputRef.current) {
        midiInputRef.current.removeEventListener('midimessage', handleMidiMessage);
      }
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    };
  }, [listening, upcomingChordInfo, handlePlayNextChord]);

  const getLyricLine = (index: number): string | null => {
    if (!chordProgression || index < 0 || index >= chordProgression.length) return null;
    return chordProgression[index].originalContext || "[Instrumental]";
  };
  const prevLyric = getLyricLine(currentProgressionIndex);
  const currentLyric = getLyricLine(upcomingChordDisplayIndex);
  const nextLyric = getLyricLine(upcomingChordDisplayIndex + 1);

  const whiteKeyFills: JSX.Element[] = [];
  const blackKeyFills: JSX.Element[] = [];

  if (upcomingChordProgItem && !isFinished && upcomingChordNotesForHighwayAndDots.length > 0) {
    const { farY, nearY } = currentPerspectiveSettings;
    const fillHorizonY = farY;
    const fillFrontY = upcomingChordYPos;
    const keyboardNearY = nearY;

    const yRange = keyboardNearY - fillHorizonY;
    let ratio = (yRange !== 0) ? Math.max(0, Math.min(1, (fillFrontY - fillHorizonY) / yRange)) : 0;

    upcomingChordNotesForHighwayAndDots.forEach(noteFullName => {
        const keyData = perspectiveKeys.find(k => k.noteFullName === noteFullName);
        if (!keyData) return;

        const fillFarLeftX_A = keyData.farLeftX;
        const fillFarRightX_B = keyData.farRightX;
        let laneNearLeftX_C = keyData.nearLeftX;
        let laneNearRightX_D = keyData.nearRightX;

        if (!keyData.isBlack) {
            const leftNeighborMidi = getNoteMidiValue(keyData.noteFullName)! - 1;
            if (leftNeighborMidi >= 0 && MIDI_NOTE_NAMES_SHARP[leftNeighborMidi % 12].includes('#')) {
                const leftBlackKeyData = perspectiveKeys.find(k => k.noteFullName === getNoteFromMidiValue(leftNeighborMidi, true) && k.isBlack);
                if (leftBlackKeyData) laneNearLeftX_C = Math.max(laneNearLeftX_C, leftBlackKeyData.nearRightX);
            }
            const whiteKeyNoteNamePart = keyData.noteFullName.slice(0, -1);
            if (["C", "D", "F", "G", "A"].includes(whiteKeyNoteNamePart)) {
                const blackKeyOnThisWhiteKeyName = `${whiteKeyNoteNamePart}#${keyData.noteFullName.slice(-1)}`;
                const blackKeyDataOnThisWhite = perspectiveKeys.find(k => k.noteFullName === blackKeyOnThisWhiteKeyName! && k.isBlack);
                if (blackKeyDataOnThisWhite) laneNearRightX_D = Math.min(laneNearRightX_D, blackKeyDataOnThisWhite.nearLeftX);
            }
        }

        const fillFrontLeftX_E = fillFarLeftX_A + (laneNearLeftX_C - fillFarLeftX_A) * ratio;
        const fillFrontRightX_F = fillFarRightX_B + (laneNearRightX_D - fillFarRightX_B) * ratio;

        const fillPoints = `${fillFrontLeftX_E},${fillFrontY} ${fillFrontRightX_F},${fillFrontY} ${fillFarRightX_B},${fillHorizonY} ${fillFarLeftX_A},${fillHorizonY}`;

        if (fillFrontY > fillHorizonY && fillFrontRightX_F > fillFrontLeftX_E && fillFarRightX_B > fillFarLeftX_A) {
            const fillElement = (
                <polygon
                    key={`fill-${noteFullName}-${upcomingChordDisplayIndex}`}
                    points={fillPoints}
                    fill={playAlongSettings.laneHighlightColor}
                    stroke="none"
                />
            );
            if (keyData.isBlack) blackKeyFills.push(fillElement);
            else whiteKeyFills.push(fillElement);
        }
    });
  }

  const playedChordName = playAlongSettings.showPlayedChordName && currentProgressionIndex >= 0 && chordProgression && chordProgression[currentProgressionIndex]
    ? interactiveChords[chordProgression[currentProgressionIndex].chordName]?.activeSimplificationName
    : null;

  const upcomingChordName = playAlongSettings.showUpcomingChordName && upcomingChordInfo
    ? upcomingChordInfo.activeSimplificationName
    : null;

  // Compute the average X position for the upcoming chord name (centered on the notes)
  const upcomingChordNameX = useMemo(() => {
    if (!upcomingChordNotesForHighwayAndDots.length) return VIEWBOX_WIDTH / 2;
    const xs = upcomingChordNotesForHighwayAndDots
      .map(noteFullName => {
        const keyData = perspectiveKeys.find(k => k.noteFullName === noteFullName);
        if (!keyData) return null;
        // Interpolate X between far and near based on the current highway highlight Y position
        const { farLeftX, farRightX, nearLeftX, nearRightX, keyFarYVisual, keyNearYActual } = keyData;
        const yRange = keyNearYActual - keyFarYVisual;
        const ratio = yRange !== 0 ? Math.max(0, Math.min(1, (upcomingChordYPos - keyFarYVisual) / yRange)) : 0;
        const leftX = farLeftX + (nearLeftX - farLeftX) * ratio;
        const rightX = farRightX + (nearRightX - farRightX) * ratio;
        return (leftX + rightX) / 2;
      })
      .filter((x): x is number => x !== null);
    if (!xs.length) return VIEWBOX_WIDTH / 2;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }, [upcomingChordNotesForHighwayAndDots, perspectiveKeys, upcomingChordYPos]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-800 dark:bg-gray-900 text-white overflow-hidden"
      aria-label="Play Along Area"
      style={{ touchAction: 'none' }}
    >
      <Button
        onClick={onExit}
        variant="ghost"
        className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 z-[120]"
        aria-label="Exit Play Along Mode"
        title="Exit (ESC)"
      >
        <XMarkIcon className="w-6 h-6"/>
      </Button>
       <Button
        onClick={() => setIsSettingsPanelOpen(true)}
        variant="ghost"
        className="absolute top-4 left-4 text-white hover:bg-white/20 p-2 z-[120]"
        aria-label="Open Play Along Settings"
        title="Settings"
      >
        <SettingsIcon className="w-6 h-6 stroke-white"/>
      </Button>

      {/* Main SVG container for lyrics, keyboard, and controls */}
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="w-full h-full" preserveAspectRatio="xMidYMin meet">
        <title>Play Along View: {song.songTitle}</title>
        
        {/* Lyrics Area */}
        <foreignObject x="0" y={lyricsAreaYStart} width={VIEWBOX_WIDTH} height={LYRICS_AREA_HEIGHT_FIXED}>
            <div className="w-full h-full text-center p-2 flex flex-col justify-center items-center">
                <p className="text-sm opacity-60 truncate h-1/3 px-4 w-full">{prevLyric || ' '}</p>
                <p className="text-xl font-semibold text-blue-400 truncate h-1/3 px-4 w-full">
                    {currentLyric || (isFinished ? "Song Finished!" : (currentProgressionIndex === -1 ? "Get Ready..." : " "))}
                </p>
                <p className="text-sm opacity-60 truncate h-1/3 px-4 w-full">{nextLyric || ' '}</p>
            </div>
        </foreignObject>

        {/* Keyboard Area */}
        <g transform={`translate(0, ${keyboardAreaYStart})`}>
            {perspectiveKeys.map(keyProps => (
                <PerspectiveKeyRenderer
                    key={keyProps.id}
                    {...keyProps}
                    isPlayAreaHighlightedForFadeOut={playedChordNotes.includes(keyProps.noteFullName)}
                    fadeOutOpacity={playedChordFadeOutOpacity}
                    whiteKeyColor={playAlongSettings.whiteKeyColor}
                    blackKeyColor={playAlongSettings.blackKeyColor}
                    keyStrokeColor={playAlongSettings.keyStrokeColor}
                    playedChordHighlightColor={playAlongSettings.playedChordHighlightColor}
                />
            ))}
            {whiteKeyFills}
            {blackKeyFills}
            {upcomingNotesForPlayAreaDots.length > 0 && !isFinished && upcomingNotesForPlayAreaDots.map(noteFullName => {
              const keyData = perspectiveKeys.find(k => k.noteFullName === noteFullName);
              if (!keyData || !keyData.frontFacePoints) return null;
              const { nearY, playAreaVisibleHeight } = currentPerspectiveSettings;
              const dotY = nearY + playAreaVisibleHeight * (keyData.isBlack ? GEOMETRIC_CONSTANTS.dotYFactorBlack : GEOMETRIC_CONSTANTS.dotYFactorWhite);
              return (
                <circle
                  key={`dot-${noteFullName}-${upcomingChordDisplayIndex}`}
                  cx={keyData.playAreaFrontFaceMidX}
                  cy={dotY}
                  r={playAlongSettings.noteDotRadius}
                  fill={playAlongSettings.noteDotColor}
                  opacity={1}
                  stroke="white"
                  strokeWidth="0.5"
                />
              );
            })}
            
            {/* Upcoming Chord Name */}
            {upcomingChordName && (
                <text
                  x={upcomingChordNameX}
                  y={Math.max(
                    currentPerspectiveSettings.farY + playAlongSettings.upcomingChordNameFontSize - 30,
                    upcomingChordYPos - playAlongSettings.upcomingChordNameFontSize * 0.7
                  )}
                  textAnchor="middle"
                  fill={playAlongSettings.upcomingChordNameColor}
                  fontSize={playAlongSettings.upcomingChordNameFontSize}
                  fontWeight="bold"
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="0.5px"
                  className="pointer-events-none select-none"
                >
                  {upcomingChordName}
                </text>
            )}

            {/* Played Chord Name */}
            {playedChordName && (
                <text
                    x={VIEWBOX_WIDTH / 2}
                    y={currentPerspectiveSettings.nearY + GEOMETRIC_CONSTANTS.playAreaVisibleHeightFactor * keyboardAreaHeight + playAlongSettings.playedChordNameFontSize + 5} // Position below play area
                    textAnchor="middle"
                    fill={playAlongSettings.playedChordNameColor}
                    fontSize={playAlongSettings.playedChordNameFontSize}
                    fontWeight="bold"
                    stroke="rgba(0,0,0,0.7)"
                    strokeWidth="1px"
                    className="pointer-events-none select-none"
                >
                    {playedChordName}
                </text>
            )}
        </g>

        {/* Controls Area */}
         <foreignObject x="0" y={controlsAreaYStart} width={VIEWBOX_WIDTH} height={CONTROLS_AREA_HEIGHT_FIXED}>
             <div className="w-full h-full flex flex-col items-center justify-center p-2">
                <Button
                  onClick={handlePlayNextChord}
                  size="lg"
                  variant='primary'
                  className='bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-blue-400 dark:focus:ring-blue-300 shadow-lg px-8 py-3'
                  aria-label={isFinished ? "Restart Song" : "Play Next Chord (Spacebar)"}
                  leftIcon={isFinished ? <ReplayIcon className="w-6 h-6" /> : <ChevronRightIcon className="w-6 h-6" />}
                >
                  {isFinished ? "Restart" : "Next Chord"}
                </Button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Press SPACEBAR to play next chord.</p>
            </div>
        </foreignObject>
      </svg>

      {isSettingsPanelOpen && (
        <PlayAlongSettingsPanel
            isOpen={isSettingsPanelOpen}
            onClose={() => setIsSettingsPanelOpen(false)}
        />
      )}

      {/* Optionally, show listening status */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[120] text-xs text-yellow-400 bg-black/50 px-3 py-1 rounded shadow">
        {listening ? "Listening for chord..." : "Not listening"}
      </div>

      {/* To test the automatic chord listening feature:

      1. Make sure you have a MIDI keyboard connected to your computer.
      2. Open your app in a browser that supports the Web MIDI API (Chrome is recommended).
      3. Enter Play Along mode for a song.
      4. When the "Listening for chord..." message appears at the bottom, play the upcoming chord on your MIDI keyboard.
      5. If the chord is recognized (by name or voicing), the app should automatically advance to the next chord (as if you pressed the "Next Chord" button).
      6. Repeat for each chord in the progression.

      Troubleshooting:
      - If nothing happens, check browser permissions for MIDI devices.
      - If you see "Not listening", make sure your MIDI device is connected and reload the page.
      - If chords are not recognized, try playing the chord in root position or as written in the songbook.
      - You can open the browser console to check for any errors related to MIDI or permissions. */}
    </div>
  );
};

export default PlayAlongView;