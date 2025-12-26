// src/stores/filesStore.js
import { defineStore } from 'pinia';

export const useFilesStore = defineStore('files', {
  state: () => ({
    video: {
      file: null, // Объект File из браузера
      url: null, // Blob URL для video элемента
      name: '',
      size: 0,
      error: null,
    },
    vtt: {
      file: null,
      content: null, // Текстовое содержимое VTT
      name: '',
      size: 0,
      error: null,
    },
    namesMatch: true, // Совпадают ли имена файлов
  }),

  getters: {
    // Проверяем, готовы ли оба файла к обработке
    isReadyToProcess: (state) => {
      return Boolean(state.video.file && state.vtt.file && !state.video.error && !state.vtt.error);
    },

    // Получаем базовое имя файла без расширения
    videoBaseName: (state) => {
      if (!state.video.name) return '';
      return state.video.name.replace(/\.[^/.]+$/, '').toLowerCase();
    },

    vttBaseName: (state) => {
      if (!state.vtt.name) return '';
      return state.vtt.name.replace(/\.[^/.]+$/, '').toLowerCase();
    },
  },

  actions: {
    // Устанавливаем видео файл
    setVideoFile(fileData) {
      // Если уже есть старый URL - освобождаем память
      if (this.video.url) {
        URL.revokeObjectURL(this.video.url);
      }

      this.video = {
        file: fileData.file,
        url: fileData.url,
        name: fileData.name,
        size: fileData.size,
        error: null,
      };

      // Проверяем соответствие имён
      this.checkNamesMatch();
    },

    // Устанавливаем VTT файл
    setVttFile(fileData) {
      this.vtt = {
        file: fileData.file,
        content: fileData.content,
        name: fileData.name,
        size: fileData.size,
        error: null,
      };

      // Проверяем соответствие имён
      this.checkNamesMatch();
    },

    // Устанавливаем ошибку для видео
    setVideoError(errorMessage) {
      this.video.error = errorMessage;
    },

    // Устанавливаем ошибку для VTT
    setVttError(errorMessage) {
      this.vtt.error = errorMessage;
    },

    // Очищаем видео файл
    clearVideoFile() {
      // КРИТИЧЕСКИ ВАЖНО: освобождаем blob URL
      if (this.video.url) {
        URL.revokeObjectURL(this.video.url);
      }

      this.video = {
        file: null,
        url: null,
        name: '',
        size: 0,
        error: null,
      };

      this.checkNamesMatch();
    },

    // Очищаем VTT файл
    clearVttFile() {
      this.vtt = {
        file: null,
        content: null,
        name: '',
        size: 0,
        error: null,
      };

      this.checkNamesMatch();
    },

    // Проверяем, совпадают ли имена файлов
    checkNamesMatch() {
      // Если оба файла не загружены - считаем что совпадают
      if (!this.video.file || !this.vtt.file) {
        this.namesMatch = true;
        return;
      }

      // Сравниваем базовые имена (без расширений)
      this.namesMatch = this.videoBaseName === this.vttBaseName;
    },
  },
});
