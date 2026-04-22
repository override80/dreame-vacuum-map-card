import { CircularButton } from '../../common';
import type { CleaningMode } from '../../../types/vacuum';
import { getCleaningModeIcon, convertCleaningModeToService, getCleaningModeFriendlyName } from '../../../utils';
import { CLEANING_MODE } from '../../../constants';

type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

interface CleaningModeSelectorProps {
  cleaningMode: string;
  cleaningModeList: string[];
  onSelect: (entityId: string, value: string) => void;
  entityId: string;
  t?: TranslateFunction;
  disabled?: boolean;
  /** Whether customize mode is currently selected */
  customizeSelected?: boolean;
}

export function CleaningModeSelector({
  cleaningMode,
  cleaningModeList,
  onSelect,
  entityId,
  t,
  disabled = false,
  customizeSelected = false,
}: CleaningModeSelectorProps) {
  return (
    <div className={`cleaning-mode-modal__power-grid ${disabled ? 'cleaning-mode-modal__power-grid--disabled' : ''}`}>
      {cleaningModeList.map((mode, idx) => {
        // Check if this mode is selected
        // For Customize, we check the customizeSelected prop since it's a UI-only state
        const isSelected =
          mode === CLEANING_MODE.CUSTOMIZE ? customizeSelected : mode === cleaningMode && !customizeSelected;

        return (
          <div key={idx} className="cleaning-mode-modal__mode-option">
            <CircularButton
              size="small"
              selected={isSelected}
              onClick={() => {
                if (disabled) return;
                // For Customize, pass the mode directly (not converted) since it's not a real HA cleaning mode
                const value =
                  mode === CLEANING_MODE.CUSTOMIZE
                    ? CLEANING_MODE.CUSTOMIZE
                    : convertCleaningModeToService(mode as CleaningMode);
                onSelect(entityId, value);
              }}
              icon={getCleaningModeIcon(mode as CleaningMode)}
            />
            <span className="cleaning-mode-modal__mode-option-label">
              {getCleaningModeFriendlyName(mode as CleaningMode, t)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
