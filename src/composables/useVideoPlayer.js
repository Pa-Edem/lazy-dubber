// src/composables/useVideoPlayer.js

import { watch } from 'vue';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSubtitlesStore } from '../stores/subtitlesStore';

/**
 * Composable для управления видеоплеером
 *
 * Основные функции:
 * - Управление воспроизведением (play/pause)
 * - Синхронизация с субтитрами
 * - Audio Ducking (умное приглушение звука)
 * - Перемотка видео
 *
 * @param {Ref} videoElement - ссылка на DOM элемент <video>
 */
export function useVideoPlayer(videoElement) {
  const playerStore = usePlayerStore();
  const settingsStore = useSettingsStore();
  const subtitlesStore = useSubtitlesStore();

  // ==========================================
  // УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ
  // ==========================================

  /**
   * Запустить воспроизведение видео
   * При включенной озвучке автоматически снижает громкость видео
   */
  const play = async () => {
    if (!videoElement.value) return;

    try {
      await videoElement.value.play();
      playerStore.setPlaying(true);

      // Применяем Audio Ducking (используем существующую логику)
      applyAudioDucking();
    } catch (error) {
      console.error('Ошибка воспроизведения:', error);
    }
  };

  /**
   * Поставить видео на паузу
   * Возвращает громкость к 100%
   */
  const pause = () => {
    if (!videoElement.value) return;

    videoElement.value.pause();
    playerStore.setPlaying(false);

    // Возвращаем оригинальную громкость
    applyAudioDucking();
  };

  /**
   * Переключить play/pause
   */
  const togglePlayPause = () => {
    if (playerStore.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // ==========================================
  // AUDIO DUCKING (УМНОЕ ПРИГЛУШЕНИЕ)
  // ==========================================

  /**
   * Применить Audio Ducking
   *
   * Логика (Вариант 2 - умный):
   * 1. Если видео играет И озвучка включена → приглушаем до duckingLevel
   * 2. Если видео на паузе ИЛИ озвучка выключена → громкость 100%
   *
   * Использует существующие методы enableDucking/disableDucking из store
   */
  const applyAudioDucking = () => {
    if (!videoElement.value) return;

    // Проверяем: нужно ли приглушение?
    const shouldDuck = playerStore.isPlaying && settingsStore.isDubbingEnabled;

    if (shouldDuck) {
      // Приглушаем звук до уровня из настроек
      playerStore.enableDucking(settingsStore.duckingLevel);
      videoElement.value.volume = settingsStore.duckingLevel;
    } else {
      // Возвращаем оригинальную громкость
      playerStore.disableDucking();
      videoElement.value.volume = playerStore.volume;
    }
  };

  /**
   * Следим за изменением настройки озвучки
   * Если пользователь выключил озвучку во время воспроизведения,
   * сразу возвращаем громкость к 100%
   */
  watch(
    () => settingsStore.isDubbingEnabled,
    () => {
      applyAudioDucking();
    }
  );

  /**
   * Следим за изменением уровня приглушения
   * Если пользователь меняет слайдер во время воспроизведения,
   * сразу применяем новое значение
   */
  watch(
    () => settingsStore.duckingLevel,
    () => {
      if (playerStore.isPlaying && settingsStore.isDubbingEnabled) {
        applyAudioDucking();
      }
    }
  );

  // ==========================================
  // СИНХРОНИЗАЦИЯ С СУБТИТРАМИ
  // ==========================================

  /**
   * Найти активный субтитр по текущему времени
   * Использует линейный поиск (простой и достаточно быстрый)
   *
   * Алгоритм:
   * 1. Проходим по массиву субтитров
   * 2. Проверяем: currentTime >= startTime && currentTime <= endTime
   * 3. Если нашли - возвращаем индекс
   * 4. Если не нашли - возвращаем -1
   *
   * @param {number} currentTime - текущее время в секундах
   * @returns {number} индекс активного субтитра или -1
   */
  const findActiveSubtitle = (currentTime) => {
    const subtitles = subtitlesStore.items;

    // Проверка: есть ли субтитры вообще?
    if (!subtitles || subtitles.length === 0) {
      return -1;
    }

    // Линейный поиск по массиву
    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];

      // Проверяем, попадает ли currentTime в интервал субтитра
      if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
        return i; // Нашли активный субтитр!
      }

      // Оптимизация: если время меньше начала субтитра,
      // значит мы между субтитрами (субтитры идут по порядку)
      if (currentTime < subtitle.startTime) {
        return -1;
      }
    }

    // Если дошли до конца массива и ничего не нашли
    return -1;
  };

  /**
   * Обработчик события timeupdate
   *
   * Вызывается браузером ~4-10 раз в секунду
   * Это встроенное событие HTML5 Video
   *
   * Что делает:
   * 1. Обновляет currentTime в store
   * 2. Ищет активный субтитр
   * 3. Обновляет currentSubtitleIndex (только если изменился)
   */
  const handleTimeUpdate = () => {
    if (!videoElement.value) return;

    const currentTime = videoElement.value.currentTime;

    // Обновляем время в store
    playerStore.updateCurrentTime(currentTime);

    // Ищем активный субтитр
    const activeIndex = findActiveSubtitle(currentTime);

    // Обновляем индекс только если он изменился
    // Зачем? Чтобы избежать лишних перерисовок компонентов
    // Vue отслеживает изменения, и каждое присваивание вызывает reactivity
    if (activeIndex !== playerStore.currentSubtitleIndex) {
      playerStore.setCurrentSubtitleIndex(activeIndex);
    }
  };

  // ==========================================
  // УПРАВЛЕНИЕ ВРЕМЕНЕМ (НАВИГАЦИЯ)
  // ==========================================

  /**
   * Перемотать видео на указанное время
   * Использует существующий метод seekTo из store
   *
   * @param {number} time - время в секундах
   */
  const seekTo = (time) => {
    if (!videoElement.value) return;

    // Store автоматически ограничит время границами [0, duration]
    playerStore.seekTo(time);

    // Применяем новое время к video элементу
    videoElement.value.currentTime = playerStore.currentTime;
  };

  /**
   * Перемотать на N секунд вперёд
   *
   * @param {number} seconds - количество секунд (по умолчанию 10)
   */
  const seekForward = (seconds = 10) => {
    const newTime = playerStore.currentTime + seconds;
    seekTo(newTime);
  };

  /**
   * Перемотать на N секунд назад
   *
   * @param {number} seconds - количество секунд (по умолчанию 10)
   */
  const seekBackward = (seconds = 10) => {
    const newTime = playerStore.currentTime - seconds;
    seekTo(newTime);
  };

  /**
   * Перемотать к конкретному субтитру
   * Используется при клике на субтитр в списке
   *
   * @param {number} index - индекс субтитра в массиве
   */
  const seekToSubtitle = (index) => {
    const subtitles = subtitlesStore.items;

    // Проверка: существует ли субтитр с таким индексом?
    if (index >= 0 && index < subtitles.length) {
      const subtitle = subtitles[index];
      seekTo(subtitle.startTime);
    }
  };

  // ==========================================
  // УПРАВЛЕНИЕ ГРОМКОСТЬЮ
  // ==========================================

  /**
   * Установить громкость видео
   * Обновляет оригинальную громкость (до применения ducking)
   *
   * @param {number} volume - значение от 0 до 1
   */
  const setVolume = (volume) => {
    if (!videoElement.value) return;

    // Store автоматически ограничит значение [0, 1]
    playerStore.setVolume(volume);

    // Применяем к video элементу
    // Если сейчас активен ducking, громкость будет приглушённой
    // Если нет - применится новая оригинальная громкость
    if (!playerStore.isDucking) {
      videoElement.value.volume = playerStore.volume;
    }
  };

  /**
   * Увеличить громкость на 10%
   */
  const volumeUp = () => {
    const newVolume = playerStore.volume + 0.1;
    setVolume(newVolume);
  };

  /**
   * Уменьшить громкость на 10%
   */
  const volumeDown = () => {
    const newVolume = playerStore.volume - 0.1;
    setVolume(newVolume);
  };

  // ==========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ==========================================

  /**
   * Обработчик загрузки метаданных видео
   *
   * Событие 'loadedmetadata' срабатывает после того,
   * как браузер получил информацию о видео:
   * - длительность
   * - разрешение
   * - кодеки
   * и т.д.
   *
   * После этого можно начинать воспроизведение
   */
  const handleLoadedMetadata = () => {
    if (!videoElement.value) return;

    // Сохраняем длительность в store
    playerStore.updateDuration(videoElement.value.duration);

    // Устанавливаем начальную громкость
    videoElement.value.volume = playerStore.volume;
  };

  /**
   * Обработчик события play
   * Срабатывает когда видео начинает воспроизведение
   */
  const handlePlay = () => {
    playerStore.setPlaying(true);
    applyAudioDucking();
  };

  /**
   * Обработчик события pause
   * Срабатывает когда видео ставится на паузу
   */
  const handlePause = () => {
    playerStore.setPlaying(false);
    applyAudioDucking();
  };

  // ==========================================
  // ВОЗВРАЩАЕМЫЕ МЕТОДЫ
  // ==========================================

  return {
    // Воспроизведение
    play,
    pause,
    togglePlayPause,

    // Навигация
    seekTo,
    seekForward,
    seekBackward,
    seekToSubtitle,

    // Громкость
    setVolume,
    volumeUp,
    volumeDown,

    // Обработчики событий (для привязки в template)
    handleTimeUpdate,
    handleLoadedMetadata,
    handlePlay,
    handlePause,

    // Утилиты
    findActiveSubtitle,
  };
}
