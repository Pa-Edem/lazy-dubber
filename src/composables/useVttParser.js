import { WebVTTParser } from 'webvtt-parser';

/**
 * Композабл для парсинга VTT текста
 */
export function useVttParser() {
  /**
   * Парсит VTT текст и возвращает массив субтитров
   * @param {string} vttText - Содержимое VTT файла как строка
   * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
   */
  async function parseVttText(vttText) {
    try {
      // Проверяем что текст не пустой
      if (!vttText || vttText.trim().length === 0) {
        return {
          success: false,
          data: [],
          error: 'VTT текст пустой',
        };
      }

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

      return {
        success: true,
        data: subtitles,
        error: null,
      };
    } catch (error) {
      console.error('VTT parsing error:', error);
      return {
        success: false,
        data: [],
        error: `Ошибка парсинга VTT: ${error.message}`,
      };
    }
  }

  return {
    parseVttText,
  };
}
