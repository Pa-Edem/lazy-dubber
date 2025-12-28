// src/constants/config.js

/**
 * Глобальная конфигурация приложения
 * Все магические числа и константы должны быть здесь
 */

export const APP_CONFIG = {
  // === ЛИМИТЫ ФАЙЛОВ ===
  MAX_VIDEO_SIZE_MB: 2048, // 2GB - максимальный размер видео
  ALLOWED_VIDEO_FORMATS: ['.mp4', '.mkv', '.webm'],
  ALLOWED_SUBTITLE_FORMATS: ['.vtt'],

  // === ПЕРЕВОД ===
  INITIAL_TRANSLATE_MINUTES: 10, // Сколько минут переводим перед стартом
  TRANSLATION_DELAY_MS: 500, // Задержка между запросами к API

  // DeepL API (основной переводчик)
  DEEPL_API_URL: 'https://api-free.deepl.com/v2/translate',
  DEEPL_MONTHLY_LIMIT: 500000, // 500K символов в месяц

  // Google Translate (fallback)
  GOOGLE_TRANSLATE_API_URL: '', // Заполним после настройки Firebase

  // === КЭШ ===
  CACHE_KEY_PREFIX: 'lazy_dubber_cache_',
  CACHE_STATS_KEY: 'lazy_dubber_stats', // Счётчик использованных символов
  MAX_CACHE_ENTRIES: 50,

  // === SPEECH SYNTHESIS ===
  // Дефолтные значения для голоса
  DEFAULT_VOICE_RATE: 1.0, // Скорость речи (1.0 = нормально)
  DEFAULT_VOICE_PITCH: 1.0, // Тональность (1.0 = нормально)
  DEFAULT_VOICE_VOLUME: 100, // Громкость

  // Автоматический расчёт скорости
  RATE_AUTO_ADJUST: true, // Включить динамический расчёт rate
  MIN_RATE: 0.8, // Минимальная скорость (медленнее нельзя)
  MAX_RATE: 1.6, // Максимальная скорость (быстрее нельзя)
  CHARS_PER_SECOND: 15, // Среднее кол-во символов в секунду при rate=1.0

  // === AUDIO DUCKING ===
  DEFAULT_DUCKING_LEVEL: 15, // Громкость видео при озвучке
  DUCKING_FADE_DURATION_MS: 300, // Плавное затухание/нарастание звука

  // === ИНТЕРФЕЙС ===
  SUBTITLE_SCROLL_OFFSET: 100, // На сколько px скроллить до центра
  PROGRESS_UPDATE_INTERVAL_MS: 1000, // Обновление "Готовность: 45%"
};

/**
 * Список языков для интерфейса (на будущее)
 */
export const LANGUAGES = {
  SOURCE: 'EN', // Язык субтитров (английский)
  TARGET: 'RU', // Язык перевода (русский)
};

/**
 * Текстовые сообщения для пользователя
 */
export const UI_MESSAGES = {
  FILE_TOO_LARGE: `Видео слишком большое! Максимум ${APP_CONFIG.MAX_VIDEO_SIZE_MB}MB`,
  INVALID_FORMAT: 'Неподдерживаемый формат файла',
  TRANSLATION_IN_PROGRESS: 'Идёт перевод субтитров...',
  READY_TO_WATCH: 'Готово к просмотру!',
  CACHE_CLEARED: 'Кэш успешно очищен',
};
