// src/composables/useVttParser.js
import { WebVTTParser } from 'webvtt-parser';
import { useSubtitlesStore } from '../stores/subtitlesStore';

/**
 * Проверяет, является ли VTT файл уже переведённым
 * @param {string} filename - Имя файла
 * @returns {boolean}
 */
function isTranslatedVtt(filename) {
  if (!filename) return false;

  const lowerName = filename.toLowerCase();
  return lowerName.endsWith('_ru.vtt') || lowerName.endsWith('.ru.vtt');
}

/**
 * Композабл для парсинга VTT текста
 */
export function useVttParser() {
  const subtitlesStore = useSubtitlesStore();

  /**
   * Парсит VTT текст и возвращает массив субтитров
   * @param {string} vttText - Содержимое VTT файла как строка
   * @param {string} filename - Имя VTT файла (для определения типа)
   * @returns {Promise<{success: boolean, data: Array, error: string|null, isTranslated: boolean}>}
   */
  async function parseVttText(vttText, filename = '') {
    try {
      // Проверяем что текст не пустой
      if (!vttText || vttText.trim().length === 0) {
        return {
          success: false,
          data: [],
          error: 'VTT текст пустой',
          isTranslated: false,
        };
      }

      // Определяем тип файла
      const isTranslated = isTranslatedVtt(filename);

      if (isTranslated) {
        console.log('🇷🇺 Обнаружен переведённый VTT файл:', filename);
      } else {
        console.log('🇬🇧 Обнаружен оригинальный VTT файл:', filename);
      }

      // Сохраняем VTT контент для кэширования
      subtitlesStore.setVttContent(vttText);
      console.log('[useVttParser] VTT content saved to store');

      // Создаём экземпляр парсера
      const parser = new WebVTTParser();

      // Парсим VTT текст
      const result = parser.parse(vttText);

      // Проверяем наличие ошибок парсинга
      if (result.errors && result.errors.length > 0) {
        console.warn('VTT parsing warnings:', result.errors);
        // Не блокируем если есть предупреждения, но нет критических ошибок
      }

      // Проверяем что есть субтитры
      if (!result.cues || result.cues.length === 0) {
        return {
          success: false,
          data: [],
          error: 'В VTT файле не найдено субтитров',
          isTranslated: false,
        };
      }

      // Преобразуем cues в наш формат
      const subtitles = result.cues.map((cue, index) => ({
        id: index + 1,
        startTime: cue.startTime, // уже в секундах
        endTime: cue.endTime, // уже в секундах
        text: cue.text,
        translation: null,
      }));

      // Сохраняем субтитры в store
      subtitlesStore.setSubtitles(subtitles);
      console.log('[useVttParser] Subtitles saved to store:', subtitles.length);

      // ========== ЕСЛИ ЭТО ПЕРЕВЕДЁННЫЙ ФАЙЛ ==========
      if (isTranslated) {
        // Сразу заливаем текст в translations
        const translations = {};
        subtitles.forEach((subtitle, index) => {
          translations[index] = subtitle.text;
        });

        // Обновляем store
        subtitlesStore.updateTranslations(translations);
        subtitlesStore.setTranslationProgress(100);

        console.log('✅ Переводы загружены из файла:', Object.keys(translations).length);
      }
      // ================================================

      return {
        success: true,
        data: subtitles,
        error: null,
        isTranslated: isTranslated, // Флаг для UploadView
      };
    } catch (error) {
      console.error('VTT parsing error:', error);
      // Сохраняем ошибку в store
      subtitlesStore.setError(error.message);
      return {
        success: false,
        data: [],
        error: `Ошибка парсинга VTT: ${error.message}`,
        isTranslated: false,
      };
    }
  }

  return {
    parseVttText,
  };
}
