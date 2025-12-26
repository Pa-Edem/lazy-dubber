// src/stores/playerStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Store для состояния видеоплеера
 * Синхронизация с HTML5 Video элементом
 */
export const usePlayerStore = defineStore('player', () => {
  // === Состояние плеера ===
  const isPlaying = ref(false); // Играет ли видео
  const currentTime = ref(0); // Текущее время в секундах
  const duration = ref(0); // Длительность видео в секундах
  const volume = ref(1.0); // Громкость (0.0 - 1.0)
  const originalVolume = ref(1.0); // Оригинальная громкость (до ducking)
  const isDucking = ref(false); // Активно ли приглушение звука

  // === Загруженные файлы ===
  const videoFile = ref(null); // File объект видео
  const vttFile = ref(null); // File объект VTT
  const videoUrl = ref(''); // Blob URL для видео

  // === Computed ===

  /**
   * Прогресс воспроизведения в процентах (0-100)
   */
  const playbackProgress = computed(() => {
    if (duration.value === 0) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  /**
   * Форматированное текущее время (MM:SS)
   */
  const formattedCurrentTime = computed(() => {
    return formatTime(currentTime.value);
  });

  /**
   * Форматированная длительность (MM:SS)
   */
  const formattedDuration = computed(() => {
    return formatTime(duration.value);
  });

  /**
   * Готов ли плеер к воспроизведению
   */
  const isReady = computed(() => {
    return videoFile.value !== null && vttFile.value !== null && duration.value > 0;
  });

  // === Actions ===

  /**
   * Устанавливает видеофайл
   */
  function setVideoFile(file) {
    // Освобождаем старый URL если был
    if (videoUrl.value) {
      URL.revokeObjectURL(videoUrl.value);
    }

    videoFile.value = file;
    videoUrl.value = URL.createObjectURL(file);
  }

  /**
   * Устанавливает VTT-файл
   */
  function setVttFile(file) {
    vttFile.value = file;
  }

  /**
   * Обновляет текущее время
   */
  function updateCurrentTime(time) {
    currentTime.value = time;
  }

  /**
   * Обновляет длительность
   */
  function updateDuration(time) {
    duration.value = time;
  }

  /**
   * Переключает воспроизведение (play/pause)
   */
  function togglePlay() {
    isPlaying.value = !isPlaying.value;
  }

  /**
   * Устанавливает состояние воспроизведения
   */
  function setPlaying(playing) {
    isPlaying.value = playing;
  }

  /**
   * Устанавливает громкость
   */
  function setVolume(vol) {
    volume.value = Math.max(0, Math.min(1, vol)); // Ограничиваем 0-1
  }

  /**
   * Включает Audio Ducking (приглушение)
   */
  function enableDucking(duckingLevel) {
    if (!isDucking.value) {
      originalVolume.value = volume.value;
    }
    volume.value = duckingLevel;
    isDucking.value = true;
  }

  /**
   * Выключает Audio Ducking (восстанавливает громкость)
   */
  function disableDucking() {
    volume.value = originalVolume.value;
    isDucking.value = false;
  }

  /**
   * Перематывает на определённое время
   */
  function seekTo(time) {
    currentTime.value = Math.max(0, Math.min(duration.value, time));
  }

  /**
   * Сбрасывает состояние плеера
   */
  function reset() {
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    volume.value = 1.0;
    originalVolume.value = 1.0;
    isDucking.value = false;

    // Освобождаем blob URL
    if (videoUrl.value) {
      URL.revokeObjectURL(videoUrl.value);
    }

    videoFile.value = null;
    vttFile.value = null;
    videoUrl.value = '';
  }

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    volume,
    originalVolume,
    isDucking,
    videoFile,
    vttFile,
    videoUrl,

    // Computed
    playbackProgress,
    formattedCurrentTime,
    formattedDuration,
    isReady,

    // Actions
    setVideoFile,
    setVttFile,
    updateCurrentTime,
    updateDuration,
    togglePlay,
    setPlaying,
    setVolume,
    enableDucking,
    disableDucking,
    seekTo,
    reset,
  };
});

/**
 * Утилита: форматирует секунды в MM:SS
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
