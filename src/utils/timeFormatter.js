/**
 * Конвертирует время из VTT формата в секунды
 * @param {string} vttTime - Время в формате "00:01:23.500" или "01:23.500"
 * @returns {number} - Время в секундах (83.5)
 */
export function parseVttTime(vttTime) {
  const parts = vttTime.split(':');
  let seconds = 0;

  if (parts.length === 3) {
    // Формат: HH:MM:SS.mmm
    seconds =
      parseInt(parts[0]) * 3600 + // часы
      parseInt(parts[1]) * 60 + // минуты
      parseFloat(parts[2]); // секунды + миллисекунды
  } else if (parts.length === 2) {
    // Формат: MM:SS.mmm
    seconds =
      parseInt(parts[0]) * 60 + // минуты
      parseFloat(parts[1]); // секунды + миллисекунды
  } else {
    // Формат: SS.mmm
    seconds = parseFloat(parts[0]);
  }

  return seconds;
}

/**
 * Конвертирует секунды в читаемый формат времени
 * @param {number} seconds - Время в секундах (83.5)
 * @returns {string} - Время в формате "00:01:23"
 */
export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [hours, minutes, secs].map((val) => String(val).padStart(2, '0')).join(':');
}
