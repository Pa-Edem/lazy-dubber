// src/stores/settingsStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { APP_CONFIG } from '../constants/config';

/**
 * Store для пользовательских настроек
 * Сохраняется в localStorage при изменении
 */
export const useSettingsStore = defineStore('settings', () => {
  // === Настройки видео ===
  const videoFrameWidth = ref(100);
  // === Настройки озвучки ===
  const voiceRate = ref(APP_CONFIG.DEFAULT_VOICE_RATE);
  const voicePitch = ref(APP_CONFIG.DEFAULT_VOICE_PITCH);
  const voiceVolume = ref(APP_CONFIG.DEFAULT_VOICE_VOLUME);
  const autoAdjustRate = ref(APP_CONFIG.RATE_AUTO_ADJUST);

  // Выбранный голос из системы
  // const selectedVoice = ref(null);
  // Вместо сохранения всего объекта голоса, сохраняем только имя
  const selectedVoiceName = ref(null);

  // === Audio Ducking ===
  const duckingLevel = ref(APP_CONFIG.DEFAULT_DUCKING_LEVEL);

  // === Флаги состояния ===
  const isDubbingEnabled = ref(true); // Включена ли озвучка вообще

  /**
   * Загружает настройки из localStorage
   */
  function loadSettings() {
    const saved = localStorage.getItem('lazy_dubber_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      voiceRate.value = parsed.voiceRate ?? voiceRate.value;
      voicePitch.value = parsed.voicePitch ?? voicePitch.value;
      voiceVolume.value = parsed.voiceVolume ?? 100;
      autoAdjustRate.value = parsed.autoAdjustRate ?? autoAdjustRate.value;
      duckingLevel.value = parsed.duckingLevel ?? duckingLevel.value;
      isDubbingEnabled.value = parsed.isDubbingEnabled ?? isDubbingEnabled.value;
      // selectedVoice.value = parsed.selectedVoice ?? null;
      selectedVoiceName.value = parsed.selectedVoiceName ?? null;
      videoFrameWidth.value = parsed.videoFrameWidth ?? 100;
    }
  }

  /**
   * Сохраняет настройки в localStorage
   */
  function saveSettings() {
    const settings = {
      voiceRate: voiceRate.value,
      voicePitch: voicePitch.value,
      voiceVolume: voiceVolume.value,
      autoAdjustRate: autoAdjustRate.value,
      duckingLevel: duckingLevel.value,
      isDubbingEnabled: isDubbingEnabled.value,
      // selectedVoice: selectedVoice.value,
      selectedVoiceName: selectedVoiceName.value,
      videoFrameWidth: videoFrameWidth.value,
    };
    localStorage.setItem('lazy_dubber_settings', JSON.stringify(settings));
  }

  /**
   * Сброс настроек к дефолтным
   */
  function resetSettings() {
    voiceRate.value = APP_CONFIG.DEFAULT_VOICE_RATE;
    voicePitch.value = APP_CONFIG.DEFAULT_VOICE_PITCH;
    voiceVolume.value = APP_CONFIG.DEFAULT_VOICE_VOLUME;
    autoAdjustRate.value = APP_CONFIG.RATE_AUTO_ADJUST;
    duckingLevel.value = APP_CONFIG.DEFAULT_DUCKING_LEVEL;
    isDubbingEnabled.value = true;
    // selectedVoice.value = null;
    selectedVoiceName.value = null;
    videoFrameWidth.value = 100;
    saveSettings();
  }

  return {
    // State
    voiceRate,
    voicePitch,
    voiceVolume,
    autoAdjustRate,
    // selectedVoice,
    selectedVoiceName,
    duckingLevel,
    isDubbingEnabled,
    videoFrameWidth,

    // Actions
    loadSettings,
    saveSettings,
    resetSettings,
  };
});
