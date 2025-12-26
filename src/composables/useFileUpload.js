// src/composables/useFileUpload.js
import { useFilesStore } from '../stores/filesStore';

export function useFileUpload(fileType) {
  const filesStore = useFilesStore();

  // Конфигурация для каждого типа файла
  const config = {
    video: {
      accept: ['.mp4', '.mkv', '.webm'],
      mimeTypes: ['video/mp4', 'video/x-matroska', 'video/webm'],
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB в байтах
      errorMessages: {
        invalidExtension: 'Неверный формат файла. Используйте .mp4, .mkv или .webm',
        invalidMimeType: 'Файл не является видео',
        tooLarge: 'Файл слишком большой. Максимум 2 ГБ',
      },
    },
    vtt: {
      accept: ['.vtt'],
      mimeTypes: ['text/vtt', 'text/plain'],
      maxSize: 10 * 1024 * 1024, // 10MB в байтах
      errorMessages: {
        invalidExtension: 'Неверный формат файла. Используйте .vtt',
        invalidMimeType: 'Файл не является текстовым',
        tooLarge: 'Файл слишком большой. Максимум 10 МБ',
        invalidContent: 'Файл не является корректным VTT файлом',
      },
    },
  };

  const currentConfig = config[fileType];

  /**
   * Проверяет расширение файла
   * @param {string} filename - имя файла
   * @returns {boolean}
   */
  const hasValidExtension = (filename) => {
    const extension = '.' + filename.split('.').pop().toLowerCase();
    return currentConfig.accept.includes(extension);
  };

  /**
   * Проверяет MIME-type файла
   * @param {string} mimeType - MIME-type из File.type
   * @returns {boolean}
   */
  const hasValidMimeType = (mimeType) => {
    // Для VTT файлов MIME может быть пустым или text/plain
    // Поэтому для VTT проверяем либо пустой, либо из списка
    if (fileType === 'vtt' && !mimeType) {
      return true; // Разрешаем пустой MIME для VTT
    }
    return currentConfig.mimeTypes.includes(mimeType);
  };

  /**
   * Основная функция валидации
   * @param {File} file - объект File
   * @returns {{ isValid: boolean, error: string | null }}
   */
  const validateFile = (file) => {
    // Проверка 1: Расширение файла
    if (!hasValidExtension(file.name)) {
      return {
        isValid: false,
        error: currentConfig.errorMessages.invalidExtension,
      };
    }

    // Проверка 2: MIME-type
    // ВАЖНО: проверяем И расширение И MIME, т.к. пользователь может
    // переименовать .txt в .vtt или .avi в .mp4
    if (!hasValidMimeType(file.type)) {
      return {
        isValid: false,
        error: currentConfig.errorMessages.invalidMimeType,
      };
    }

    // Проверка 3: Размер файла
    if (file.size > currentConfig.maxSize) {
      return {
        isValid: false,
        error: currentConfig.errorMessages.tooLarge,
      };
    }

    // Всё ок!
    return {
      isValid: true,
      error: null,
    };
  };

  /**
   * Читает содержимое VTT файла как текст
   * @param {File} file - VTT файл
   * @returns {Promise<string>} - содержимое файла
   */
  const readVttContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // Когда чтение завершено успешно
      reader.onload = (e) => {
        const content = e.target.result;

        // Базовая проверка: VTT файл должен начинаться с "WEBVTT"
        if (!content.trim().startsWith('WEBVTT')) {
          reject(new Error(currentConfig.errorMessages.invalidContent));
          return;
        }

        resolve(content);
      };

      // Если произошла ошибка при чтении
      reader.onerror = () => {
        reject(new Error('Ошибка при чтении файла'));
      };

      // Начинаем читать файл как текст (UTF-8)
      reader.readAsText(file, 'UTF-8');
    });
  };

  /**
   * Основная функция обработки файла
   * @param {File} file - файл для обработки
   * @returns {Promise<void>}
   */
  const handleFile = async (file) => {
    // Шаг 1: Валидация
    const validation = validateFile(file);

    if (!validation.isValid) {
      // Сохраняем ошибку в store
      if (fileType === 'video') {
        filesStore.setVideoError(validation.error);
      } else {
        filesStore.setVttError(validation.error);
      }
      return;
    }

    // Шаг 2: Обработка в зависимости от типа файла
    try {
      if (fileType === 'video') {
        // Для видео создаём blob URL
        const url = URL.createObjectURL(file);

        filesStore.setVideoFile({
          file: file,
          url: url,
          name: file.name,
          size: file.size,
        });
      } else if (fileType === 'vtt') {
        // Для VTT читаем содержимое
        const content = await readVttContent(file);

        filesStore.setVttFile({
          file: file,
          content: content,
          name: file.name,
          size: file.size,
        });
      }
    } catch (error) {
      // Если произошла ошибка (например, при чтении VTT)
      if (fileType === 'video') {
        filesStore.setVideoError(error.message);
      } else {
        filesStore.setVttError(error.message);
      }
    }
  };

  // Возвращаем публичный API композабла
  return {
    validateFile,
    handleFile,
    acceptedFormats: currentConfig.accept.join(', '),
  };
}
