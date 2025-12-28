/**
 * Утилита для экспорта переведённых субтитров в VTT формат
 *
 * Формат VTT:
 * WEBVTT
 *
 * 00:00:01.000 --> 00:00:03.500
 * Переведённый текст
 *
 * 00:00:04.000 --> 00:00:07.200
 * Следующая фраза
 */

/**
 * Конвертирует секунды в формат VTT времени (HH:MM:SS.mmm)
 * @param {number} seconds - Время в секундах
 * @returns {string} - Форматированное время
 *
 * Пример: 65.5 → "00:01:05.500"
 */
function formatVttTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0') +
    ':' +
    String(secs).padStart(2, '0') +
    '.' +
    String(milliseconds).padStart(3, '0')
  );
}

/**
 * Генерирует VTT файл из массива субтитров и переводов
 *
 * @param {Array} subtitles - Массив субтитров [{startTime, endTime, text}, ...]
 * @param {Object} translations - Объект переводов {index: "перевод"}
 * @returns {string} - Содержимое VTT файла
 */
export function generateVttContent(subtitles, translations) {
  // Заголовок VTT
  let vttContent = 'WEBVTT\n\n';

  // Проходим по всем субтитрам
  subtitles.forEach((subtitle, index) => {
    const translation = translations[index];

    // Пропускаем если нет перевода
    if (!translation) {
      return;
    }

    // Форматируем время
    const startTime = formatVttTime(subtitle.startTime);
    const endTime = formatVttTime(subtitle.endTime);

    // Добавляем блок субтитра
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${translation}\n\n`;
  });

  return vttContent;
}

/**
 * Скачивает VTT файл на компьютер пользователя
 *
 * @param {string} content - Содержимое VTT файла
 * @param {string} filename - Имя файла (с расширением)
 *
 * Принцип работы:
 * 1. Создаём Blob объект с типом text/vtt
 * 2. Создаём временную ссылку через URL.createObjectURL
 * 3. Программно кликаем по ссылке для скачивания
 * 4. Очищаем память (revokeObjectURL)
 */
export function downloadVttFile(content, filename) {
  // Создаём Blob из текста
  const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });

  // Создаём временный URL
  const url = URL.createObjectURL(blob);

  // Создаём невидимую ссылку
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Добавляем в DOM, кликаем, удаляем
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Освобождаем память
  URL.revokeObjectURL(url);

  console.log(`✅ VTT файл "${filename}" скачан`);
}

/**
 * Генерирует имя файла для экспорта
 *
 * @param {string} originalFilename - Имя оригинального видео файла
 * @returns {string} - Имя для VTT файла
 *
 * Пример: "movie.mp4" → "movie_ru.vtt"
 */
export function generateExportFilename(originalFilename) {
  if (!originalFilename) {
    return 'subtitles_ru.vtt';
  }

  // Убираем расширение видео
  const nameWithoutExt = originalFilename.replace(/\.(mp4|mkv|avi|webm)$/i, '');

  // Добавляем суффикс _ru
  return `${nameWithoutExt}_ru.vtt`;
}
