import { CircularButton } from '../../common';
import type { CleaningMode } from '../../../types/vacuum';
import { getCleaningModeIcon, convertCleaningModeToService, getCleaningModeFriendlyName } from '../../../utils';

type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

interface CleaningModeSelectorProps {
  cleaningMode: string;
  cleaningModeList: string[];
  onSelect: (entityId: string, value: string) => void;
  entityId: string;
  t?: TranslateFunction;
  disabled?: boolean;
}

export function CleaningModeSelector({
  cleaningMode,
  cleaningModeList,
  onSelect,
  entityId,
  t,
  disabled = false,
}: CleaningModeSelectorProps) {
  return (
    <div className={`cleaning-mode-modal__power-grid ${disabled ? 'cleaning-mode-modal__power-grid--disabled' : ''}`}>
      {cleaningModeList.map((mode, idx) => (
        <div key={idx} className="cleaning-mode-modal__mode-option">
          <CircularButton
            size="small"
            selected={mode === cleaningMode}
            onClick={() => !disabled && onSelect(entityId, convertCleaningModeToService(mode as CleaningMode))}
            icon={getCleaningModeIcon(mode as CleaningMode)}
          />
          <span className="cleaning-mode-modal__mode-option-label">
            {getCleaningModeFriendlyName(mode as CleaningMode, t)}
          </span>
        </div>
      ))}
    </div>
  );
}
