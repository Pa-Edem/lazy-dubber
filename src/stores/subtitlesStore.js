// src/stores/subtitlesStore.js
import { defineStore } from 'pinia';

export const useSubtitlesStore = defineStore('subtitles', {
  state: () => ({
    // ===== Основные данные =====
    items: [], // Массив распарсенных субтитров
    currentIndex: -1, // Индекс текущего активного субтитра (ДОБАВЛЕНО)

    // ===== Метаинформация =====
    isLoading: false, // Идёт ли парсинг прямо сейчас
    error: null, // Текст ошибки если парсинг не удался
    totalCount: 0, // Общее количество субтитров
    duration: 0, // Общая длительность видео (в секундах)

    // ===== Переводы =====
    translations: {}, // { index: "переведённый текст" }
    translationProgress: 0, // 0-100%
    isTranslating: false, // Идёт ли перевод сейчас
    translationError: null, // Ошибка перевода (если есть)
    vttContent: '', // Контент VTT файла (для кэширования)
  }),

  getters: {
    /**
     * Есть ли загруженные субтитры
     */
    hasSubtitles: (state) => state.items.length > 0,

    /**
     * Форматированная длительность для отображения
     */
    formattedDuration: (state) => {
      const hours = Math.floor(state.duration / 3600);
      const minutes = Math.floor((state.duration % 3600) / 60);
      const seconds = Math.floor(state.duration % 60);

      if (hours > 0) {
        return `${hours}ч ${minutes}м`;
      }
      return `${minutes}м ${seconds}с`;
    },

    /**
     * Есть ли ошибка
     */
    hasError: (state) => state.error !== null,

    /**
     * Получить перевод для конкретного субтитра
     * @param {number} index - Индекс субтитра
     * @returns {string|null}
     */
    getTranslation: (state) => (index) => {
      return state.translations[index] || null;
    },

    /**
     * Получить текущий субтитр с переводом
     * @returns {Object|null}
     */
    currentSubtitleWithTranslation(state) {
      if (state.currentIndex === -1) return null;

      const subtitle = state.items[state.currentIndex]; // ← ИСПРАВЛЕНО: items вместо subtitles
      if (!subtitle) return null;

      return {
        ...subtitle,
        translation: state.translations[state.currentIndex] || null,
      };
    },

    /**
     * Процент готовых переводов
     * @returns {number}
     */
    translationCompleteness(state) {
      if (state.items.length === 0) return 0; // ← ИСПРАВЛЕНО: items вместо subtitles

      const translatedCount = Object.keys(state.translations).length;
      return Math.round((translatedCount / state.items.length) * 100);
    },
  },

  actions: {
    /**
     * Сохраняет распарсенные субтитры в store
     * @param {Array} subtitles - Массив объектов субтитров
     */
    setSubtitles(subtitles) {
      this.items = subtitles;
      this.totalCount = subtitles.length;

      // Вычисляем общую длительность из последнего субтитра
      if (subtitles.length > 0) {
        const lastSubtitle = subtitles[subtitles.length - 1];
        this.duration = lastSubtitle.endTime;
      }

      // Очищаем ошибку если была
      this.error = null;
    },

    /**
     * Устанавливает состояние загрузки
     * @param {boolean} loading - Идёт ли загрузка
     */
    setLoading(loading) {
      this.isLoading = loading;
    },

    /**
     * Устанавливает ошибку парсинга
     * @param {string} errorMessage - Текст ошибки
     */
    setError(errorMessage) {
      this.error = errorMessage;
      this.isLoading = false;
    },

    /**
     * Очищает все субтитры и сбрасывает состояние
     */
    clearSubtitles() {
      this.items = [];
      this.currentIndex = -1; // ← ДОБАВЛЕНО
      this.totalCount = 0;
      this.duration = 0;
      this.error = null;
      this.isLoading = false;
    },

    /**
     * Устанавливает индекс текущего субтитра
     * @param {number} index - Индекс субтитра
     */
    setCurrentIndex(index) {
      // ← ДОБАВЛЕНО: новый метод
      this.currentIndex = index;
    },

    /**
     * Получает субтитр по индексу
     * @param {number} index - Индекс субтитра
     * @returns {Object|null}
     */
    getSubtitleByIndex(index) {
      return this.items[index] || null;
    },

    /**
     * Находит активный субтитр по времени видео
     * @param {number} currentTime - Текущее время видео в секундах
     * @returns {Object|null}
     */
    findActiveSubtitle(currentTime) {
      return (
        this.items.find((subtitle) => currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) || null
      );
    },

    /**
     * Находит индекс активного субтитра по времени
     * @param {number} currentTime - Текущее время видео в секундах
     * @returns {number} - Индекс или -1 если не найден
     */
    findActiveSubtitleIndex(currentTime) {
      // ← ДОБАВЛЕНО: новый метод
      return this.items.findIndex((subtitle) => currentTime >= subtitle.startTime && currentTime <= subtitle.endTime);
    },

    /**
     * Сохранить контент VTT файла
     * @param {string} content
     */
    setVttContent(content) {
      this.vttContent = content;
    },

    /**
     * Обновить переводы (батч)
     * @param {Object} translations - { index: "text" }
     */
    updateTranslations(translations) {
      this.translations = { ...this.translations, ...translations };
    },

    /**
     * Установить один перевод
     * @param {number} index
     * @param {string} translation
     */
    setTranslation(index, translation) {
      this.translations[index] = translation;
    },

    /**
     * Обновить прогресс перевода
     * @param {number} progress - 0-100
     */
    setTranslationProgress(progress) {
      this.translationProgress = progress;
    },

    /**
     * Установить статус перевода
     * @param {boolean} isTranslating
     */
    setTranslatingStatus(isTranslating) {
      this.isTranslating = isTranslating;
    },

    /**
     * Установить ошибку перевода
     * @param {Error|string|null} error
     */
    setTranslationError(error) {
      this.translationError = error ? error.toString() : null;
    },

    /**
     * Очистить все переводы
     */
    clearTranslations() {
      this.translations = {};
      this.translationProgress = 0;
      this.translationError = null;
    },

    /**
     * Сбросить всё (при загрузке нового файла)
     */
    reset() {
      // Основные данные
      this.items = []; // ← ИСПРАВЛЕНО: items вместо subtitles
      this.currentIndex = -1; // ← Теперь существует в state
      this.totalCount = 0;
      this.duration = 0;

      // Состояния
      this.isLoading = false;
      this.error = null;

      // Переводы
      this.translations = {};
      this.translationProgress = 0;
      this.isTranslating = false;
      this.translationError = null;
      this.vttContent = '';
    },
  },
});
