import React from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import SwitchToggle from '../../../components/common/SwitchToggle';
import { PlayAlongSettings } from '../../../types';
import { useAppData } from '../../../contexts/AppDataContext';
import { DEFAULT_PLAY_ALONG_SETTINGS } from '../../../constants';
import CollapsibleSection from '../../../components/common/CollapsibleSection';


interface PlayAlongSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlayAlongSettingsPanel: React.FC<PlayAlongSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { playAlongSettings, updatePlayAlongSetting, resetPlayAlongSettings, updateMultiplePlayAlongSettings } = useAppData();

  const handleReset = () => {
    resetPlayAlongSettings();
  };
  
  const handleColorChange = (key: keyof PlayAlongSettings, value: string) => {
     // Basic validation for color (hex or rgba)
    if (/^#([0-9A-Fa-f]{3,4}){1,2}$/.test(value) || /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(value)) {
      updatePlayAlongSetting(key, value);
    } else {
      // Potentially show an error or revert to previous value
      console.warn(`Invalid color format for ${key}: ${value}`);
    }
  };
  
  const handleNumberChange = (key: keyof PlayAlongSettings, value: string, min?: number, max?: number, isFloat: boolean = false) => {
    const numValue = isFloat ? parseFloat(value) : parseInt(value, 10);
    if (!isNaN(numValue)) {
        let validatedValue = numValue;
        if (min !== undefined) validatedValue = Math.max(min, validatedValue);
        if (max !== undefined) validatedValue = Math.min(max, validatedValue);
        updatePlayAlongSetting(key, validatedValue as any);
    }
  };


  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Play Along Settings" footer={
      <div className="flex justify-between items-center">
        <Button variant="danger" onClick={handleReset} size="sm">Reset to Defaults</Button>
        <Button onClick={onClose} size="sm">Done</Button>
      </div>
    }>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
        <CollapsibleSection title="Layout & Speed" initialOpen={true}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                <Select
                    label="Lyrics Position"
                    options={[{value: 'top', label: 'Top'}, {value: 'bottom', label: 'Bottom'}]}
                    value={playAlongSettings.lyricsPosition}
                    onChange={(e) => updatePlayAlongSetting('lyricsPosition', e.target.value as 'top' | 'bottom')}
                    containerClassName="mb-0"
                />
                 <Input
                    label="Base White Key Width (px)"
                    type="number"
                    min="10" max="50" step="1"
                    value={playAlongSettings.baseWhiteKeyWidth.toString()}
                    onChange={(e) => handleNumberChange('baseWhiteKeyWidth', e.target.value, 10, 50)}
                    containerClassName="mb-0"
                />
                <Input
                    label="Animation Speed Factor"
                    type="number"
                    min="0.1" max="3.0" step="0.1"
                    value={playAlongSettings.animationSpeedFactor.toString()}
                    onChange={(e) => handleNumberChange('animationSpeedFactor', e.target.value, 0.1, 3.0, true)}
                    containerClassName="mb-0"
                />
            </div>
        </CollapsibleSection>

        <CollapsibleSection title="Colors & Highlights" initialOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                <Input label="Lane Highlight Color" type="text" value={playAlongSettings.laneHighlightColor} onChange={e => handleColorChange('laneHighlightColor', e.target.value)} containerClassName="mb-0" />
                <Input label="Played Chord Color" type="text" value={playAlongSettings.playedChordHighlightColor} onChange={e => handleColorChange('playedChordHighlightColor', e.target.value)} containerClassName="mb-0" />
                <Input label="Note Dot Color" type="text" value={playAlongSettings.noteDotColor} onChange={e => handleColorChange('noteDotColor', e.target.value)} containerClassName="mb-0" />
                <Input label="White Key Color" type="text" value={playAlongSettings.whiteKeyColor} onChange={e => handleColorChange('whiteKeyColor', e.target.value)} containerClassName="mb-0" />
                <Input label="Black Key Color" type="text" value={playAlongSettings.blackKeyColor} onChange={e => handleColorChange('blackKeyColor', e.target.value)} containerClassName="mb-0" />
                <Input label="Key Stroke Color" type="text" value={playAlongSettings.keyStrokeColor} onChange={e => handleColorChange('keyStrokeColor', e.target.value)} containerClassName="mb-0" />
            </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="Chord Name Display" initialOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-2">
                 <SwitchToggle label="Show Played Chord Name" checked={playAlongSettings.showPlayedChordName} onChange={v => updatePlayAlongSetting('showPlayedChordName',v)} />
                 <SwitchToggle label="Show Upcoming Chord Name" checked={playAlongSettings.showUpcomingChordName} onChange={v => updatePlayAlongSetting('showUpcomingChordName',v)} />
                {playAlongSettings.showPlayedChordName && (
                    <>
                        <Input label="Played Chord Color" type="text" value={playAlongSettings.playedChordNameColor} onChange={e => handleColorChange('playedChordNameColor', e.target.value)} containerClassName="mb-0" />
                        <Input label="Played Chord Font Size (px)" type="number" min="10" max="40" value={playAlongSettings.playedChordNameFontSize.toString()} onChange={e => handleNumberChange('playedChordNameFontSize', e.target.value, 10, 40)} containerClassName="mb-0" />
                    </>
                )}
                {playAlongSettings.showUpcomingChordName && (
                    <>
                        <Input label="Upcoming Chord Color" type="text" value={playAlongSettings.upcomingChordNameColor} onChange={e => handleColorChange('upcomingChordNameColor', e.target.value)} containerClassName="mb-0" />
                        <Input label="Upcoming Chord Font Size (px)" type="number" min="10" max="30" value={playAlongSettings.upcomingChordNameFontSize.toString()} onChange={e => handleNumberChange('upcomingChordNameFontSize', e.target.value, 10, 30)} containerClassName="mb-0" />
                    </>
                )}
            </div>
        </CollapsibleSection>

        <CollapsibleSection title="Note Dots" initialOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                <Input
                    label="Note Dot Radius (px)"
                    type="number"
                    min="1" max="10" step="0.5"
                    value={playAlongSettings.noteDotRadius.toString()}
                    onChange={(e) => handleNumberChange('noteDotRadius', e.target.value, 1, 10, true)}
                    containerClassName="mb-0"
                />
            </div>
        </CollapsibleSection>

      </div>
    </Modal>
  );
};

export default PlayAlongSettingsPanel;