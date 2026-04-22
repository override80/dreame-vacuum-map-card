import { useCallback } from 'react';
import type { Hass, CleaningMode, Zone, StopAction } from '../types/homeassistant';
import type { RoomCleaningConfig } from '../types/vacuum';
import { useTranslation } from './useTranslation';
import { convertUIZoneToVacuumZone } from '../utils/zoneConverter';

interface VacuumServicesParams {
  hass: Hass;
  entityId: string;
  mapEntityId: string;
  onSuccess?: (message: string) => void;
}

/**
 * Hook providing vacuum service operations
 */
export function useVacuumServices({ hass, entityId, mapEntityId, onSuccess }: VacuumServicesParams) {
  const { t } = useTranslation();

  const handleStart = useCallback(() => {
    console.debug('[Vacuum] Start full clean', entityId);
    hass.callService('vacuum', 'start', { entity_id: entityId });
    onSuccess?.(t('toast.starting_full_clean'));
  }, [hass, entityId, onSuccess, t]);

  const handlePause = useCallback(() => {
    console.debug('[Vacuum] Pause', entityId);
    hass.callService('vacuum', 'pause', { entity_id: entityId });
    onSuccess?.(t('toast.pausing_vacuum'));
  }, [hass, entityId, onSuccess, t]);

  const handleStop = useCallback(
    (action: StopAction = 'stop') => {
      console.debug('[Vacuum] Stop', { action, entityId });
      hass.callService('vacuum', 'stop', { entity_id: entityId });
      if (action === 'stop_and_dock') {
        hass.callService('vacuum', 'return_to_base', { entity_id: entityId });
        onSuccess?.(t('toast.stopping_and_docking'));
      } else {
        onSuccess?.(t('toast.stopping_vacuum'));
      }
    },
    [hass, entityId, onSuccess, t]
  );

  const handleDock = useCallback(() => {
    console.debug('[Vacuum] Return to dock', entityId);
    hass.callService('vacuum', 'return_to_base', { entity_id: entityId });
    onSuccess?.(t('toast.vacuum_docking'));
  }, [hass, entityId, onSuccess, t]);

  const handleCleanSegments = useCallback(
    (segments: number[], count: number, repeats: number = 1) => {
      console.debug('[Vacuum] Clean segments', { entityId, segments, count, repeats });
      hass.callService('dreame_vacuum', 'vacuum_clean_segment', {
        entity_id: entityId,
        segments,
        repeats,
      });
      const key = count === 1 ? 'toast.starting_room_clean' : 'toast.starting_room_clean_plural';
      onSuccess?.(t(key, { count: String(count) }));
    },
    [hass, entityId, onSuccess, t]
  );

  /**
   * Clean segments with per-room configuration (for Customize mode)
   * Sends arrays of per-room settings to the Dreame vacuum service
   */
  const handleCleanSegmentsCustomized = useCallback(
    (roomConfigs: RoomCleaningConfig[]) => {
      if (roomConfigs.length === 0) {
        console.debug('[Vacuum] No room configs provided');
        return;
      }

      const segments = roomConfigs.map((c) => c.roomId);
      const repeats = roomConfigs.map((c) => c.cycles);
      const suctionLevels = roomConfigs.map((c) => c.suctionLevel);
      const waterVolumes = roomConfigs.map((c) => c.mopWetness);

      console.debug('[Vacuum] Clean segments with custom config', {
        entityId,
        segments,
        repeats,
        suctionLevels,
        waterVolumes,
        roomConfigs,
      });

      hass.callService('dreame_vacuum', 'vacuum_clean_segment', {
        entity_id: entityId,
        segments,
        repeats,
        suction_level: suctionLevels,
        water_volume: waterVolumes,
      });

      const count = roomConfigs.length;
      const key = count === 1 ? 'toast.starting_room_clean' : 'toast.starting_room_clean_plural';
      onSuccess?.(t(key, { count: String(count) }));
    },
    [hass, entityId, onSuccess, t]
  );

  const handleCleanZone = useCallback(
    (zone: Zone, imageWidth: number, imageHeight: number, repeats: number = 1) => {
      const mapEntity = hass.states[mapEntityId];

      console.debug('[Vacuum] Clean zone - input:', {
        uiZone: zone,
        imageWidth,
        imageHeight,
        mapEntityId,
        repeats,
        calibrationPoints: mapEntity?.attributes?.calibration_points,
      });

      // Convert UI zone (percentage) to vacuum coordinates
      const vacuumZone = convertUIZoneToVacuumZone(zone, mapEntity, imageWidth, imageHeight);

      console.debug('[Vacuum] Clean zone - converted:', vacuumZone);

      hass.callService('dreame_vacuum', 'vacuum_clean_zone', {
        entity_id: entityId,
        zone: [vacuumZone.x1, vacuumZone.y1, vacuumZone.x2, vacuumZone.y2],
        repeats,
      });
      onSuccess?.(t('toast.starting_zone_clean'));
    },
    [hass, entityId, mapEntityId, onSuccess, t]
  );

  const handleClean = useCallback(
    (
      mode: CleaningMode,
      selectedRooms: Map<number, string>,
      selectedZone: Zone | null,
      imageWidth?: number,
      imageHeight?: number,
      repeats: number = 1,
      roomConfigs?: RoomCleaningConfig[]
    ) => {
      console.debug('[Vacuum] Handle clean', {
        mode,
        selectedRooms: Array.from(selectedRooms.entries()),
        selectedZone,
        imageWidth,
        imageHeight,
        repeats,
        customizeMode: !!roomConfigs,
      });

      switch (mode) {
        case 'all':
          // If customize mode with room configs, clean all rooms with customized settings
          if (roomConfigs && roomConfigs.length > 0) {
            handleCleanSegmentsCustomized(roomConfigs);
          } else {
            handleStart();
          }
          break;
        case 'room':
          if (selectedRooms.size > 0) {
            // If customize mode with room configs, use customized settings
            if (roomConfigs && roomConfigs.length > 0) {
              // Filter configs to only selected rooms
              const selectedConfigs = roomConfigs.filter((c) => selectedRooms.has(c.roomId));
              if (selectedConfigs.length > 0) {
                handleCleanSegmentsCustomized(selectedConfigs);
              } else {
                // Fallback to standard cleaning if no configs match
                handleCleanSegments(Array.from(selectedRooms.keys()), selectedRooms.size, repeats);
              }
            } else {
              handleCleanSegments(Array.from(selectedRooms.keys()), selectedRooms.size, repeats);
            }
          } else {
            console.debug('[Vacuum] No rooms selected');
            onSuccess?.(t('toast.select_rooms_first'));
          }
          break;
        case 'zone':
          if (selectedZone && imageWidth && imageHeight) {
            handleCleanZone(selectedZone, imageWidth, imageHeight, repeats);
          } else if (selectedZone) {
            console.debug('[Vacuum] Zone selected but no image dimensions');
            onSuccess?.(t('toast.cannot_determine_map'));
          } else {
            console.debug('[Vacuum] No zone selected');
            onSuccess?.(t('toast.select_zone_first'));
          }
          break;
      }
    },
    [handleStart, handleCleanSegments, handleCleanSegmentsCustomized, handleCleanZone, onSuccess, t]
  );

  return {
    handleStart,
    handlePause,
    handleStop,
    handleDock,
    handleCleanSegments,
    handleCleanSegmentsCustomized,
    handleCleanZone,
    handleClean,
  };
}
