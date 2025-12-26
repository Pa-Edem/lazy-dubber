// src/stores/subtitlesStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { APP_CONFIG } from '../constants/config';

/**
 * Store для субтитров и переводов
 * Управляет кэшем, прогрессом перевода, синхронизацией с видео
 */
export const useSubtitlesStore = defineStore('subtitles', () => {
  // === Исходные данные ===
  const originalSubtitles = ref([]); // Массив исходных субтитров из VTT
  const videoFileName = ref(''); // Имя видеофайла (для кэша)
  const vttHash = ref(''); // Хэш VTT-файла (для проверки актуальности)

  // === Переведённые субтитры ===
  // Структура: { index: 0, original: "Hello", translated: "Привет", start: 1.5, end: 3.2 }
  const translatedSubtitles = ref([]);

  // === Прогресс перевода ===
  const totalSubtitles = ref(0); // Всего субтитров
  const translatedCount = ref(0); // Переведено субтитров
  const isTranslating = ref(false); // Идёт ли перевод сейчас
  const translationError = ref(null); // Ошибка перевода

  // === Текущий субтитр (синхронизация с видео) ===
  const currentSubtitleIndex = ref(-1); // Индекс текущего субтитра (-1 = нет)

  // === Computed (вычисляемые свойства) ===

  /**
   * Прогресс перевода в процентах (0-100)
   */
  const translationProgress = computed(() => {
    if (totalSubtitles.value === 0) return 0;
    return Math.round((translatedCount.value / totalSubtitles.value) * 100);
  });

  /**
   * Готово ли видео к просмотру (первые 10 минут переведены)
   */
  const isReadyToWatch = computed(() => {
    // Ищем последний субтитр в первых 10 минутах
    const tenMinutesInSeconds = APP_CONFIG.INITIAL_TRANSLATE_MINUTES * 60;
    const initialSubtitlesCount = originalSubtitles.value.findIndex((sub) => sub.start > tenMinutesInSeconds);

    // Если все субтитры короче 10 минут, берём все
    const requiredCount = initialSubtitlesCount === -1 ? originalSubtitles.value.length : initialSubtitlesCount;

    return translatedCount.value >= requiredCount;
  });

  /**
   * Текущий активный субтитр (объект)
   */
  const currentSubtitle = computed(() => {
    if (currentSubtitleIndex.value === -1) return null;
    return translatedSubtitles.value[currentSubtitleIndex.value] || null;
  });

  // === Actions (методы) ===

  /**
   * Устанавливает исходные субтитры из VTT-файла
   */
  function setOriginalSubtitles(subtitles, fileName, hash) {
    originalSubtitles.value = subtitles;
    videoFileName.value = fileName;
    vttHash.value = hash;
    totalSubtitles.value = subtitles.length;
    translatedCount.value = 0;
    translatedSubtitles.value = [];
    currentSubtitleIndex.value = -1;
  }

  /**
   * Добавляет переведённый субтитр
   */
  function addTranslation(index, translatedText) {
    const original = originalSubtitles.value[index];
    if (!original) {
      console.warn(`Субтитр с индексом ${index} не найден`);
      return;
    }

    translatedSubtitles.value[index] = {
      index,
      original: original.text,
      translated: translatedText,
      start: original.start,
      end: original.end,
    };

    translatedCount.value++;
  }

  /**
   * Загружает переводы из кэша
   */
  function loadFromCache() {
    const cacheKey = `${APP_CONFIG.CACHE_KEY_PREFIX}${videoFileName.value}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return false;

    try {
      const parsed = JSON.parse(cached);

      // Проверяем актуальность (совпадает ли хэш VTT)
      if (parsed.subtitle_hash !== vttHash.value) {
        console.log('Кэш устарел (другой VTT-файл), перезаписываем');
        return false;
      }

      // Восстанавливаем переводы
      translatedSubtitles.value = parsed.translations;
      translatedCount.value = parsed.translations.length;

      console.log(`Загружено из кэша: ${translatedCount.value} переводов`);
      return true;
    } catch (error) {
      console.error('Ошибка загрузки кэша:', error);
      return false;
    }
  }

  /**
   * Сохраняет переводы в кэш
   */
  function saveToCache() {
    const cacheKey = `${APP_CONFIG.CACHE_KEY_PREFIX}${videoFileName.value}`;
    const cacheData = {
      subtitle_hash: vttHash.value,
      translations: translatedSubtitles.value,
      cachedAt: Date.now(),
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('Кэш сохранён');
    } catch (error) {
      console.error('Ошибка сохранения кэша:', error);
      // Возможно, localStorage переполнен
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage переполнен, очищаем старые кэши');
        clearOldCaches();
        // Пробуем ещё раз
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (e) {
          console.error('Не удалось сохранить даже после очистки:', e);
        }
      }
    }
  }

  /**
   * Очищает все кэши переводов
   */
  function clearAllCaches() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter((key) => key.startsWith(APP_CONFIG.CACHE_KEY_PREFIX));

    cacheKeys.forEach((key) => localStorage.removeItem(key));
    console.log(`Удалено ${cacheKeys.length} кэшей`);
  }

  /**
   * Очищает старые кэши (старше 30 дней)
   */
  function clearOldCaches() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter((key) => key.startsWith(APP_CONFIG.CACHE_KEY_PREFIX));
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    cacheKeys.forEach((key) => {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (cached.cachedAt < thirtyDaysAgo) {
          localStorage.removeItem(key);
          deletedCount++;
        }
      } catch (e) {
        // Повреждённый кэш, удаляем
        localStorage.removeItem(key);
        deletedCount++;
      }
    });

    console.log(`Удалено ${deletedCount} старых кэшей`);
  }

  /**
   * Находит субтитр по времени видео
   */
  function findSubtitleByTime(currentTime) {
    const index = translatedSubtitles.value.findIndex(
      (sub) => sub && sub.start <= currentTime && sub.end >= currentTime
    );
    currentSubtitleIndex.value = index;
    return index;
  }

  /**
   * Сбрасывает состояние store
   */
  function reset() {
    originalSubtitles.value = [];
    translatedSubtitles.value = [];
    videoFileName.value = '';
    vttHash.value = '';
    totalSubtitles.value = 0;
    translatedCount.value = 0;
    isTranslating.value = false;
    translationError.value = null;
    currentSubtitleIndex.value = -1;
  }

  return {
    // State
    originalSubtitles,
    translatedSubtitles,
    videoFileName,
    vttHash,
    totalSubtitles,
    translatedCount,
    isTranslating,
    translationError,
    currentSubtitleIndex,

    // Computed
    translationProgress,
    isReadyToWatch,
    currentSubtitle,

    // Actions
    setOriginalSubtitles,
    addTranslation,
    loadFromCache,
    saveToCache,
    clearAllCaches,
    clearOldCaches,
    findSubtitleByTime,
    reset,
  };
});
