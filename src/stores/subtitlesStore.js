// src/stores/subtitlesStore.js
import { defineStore } from 'pinia';

export const useSubtitlesStore = defineStore('subtitles', {
  state: () => ({
    items: [], // Массив распарсенных субтитров
    isLoading: false, // Идёт ли парсинг прямо сейчас
    error: null, // Текст ошибки если парсинг не удался
    totalCount: 0, // Общее количество субтитров
    duration: 0, // Общая длительность видео (в секундах)
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
      this.totalCount = 0;
      this.duration = 0;
      this.error = null;
      this.isLoading = false;
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
  },
});
