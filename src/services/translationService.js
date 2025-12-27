// src/services/translationService.js

/**
 * Сервис управления переводом субтитров
 *
 * Основные возможности:
 * - Умная очередь перевода (первые 10 минут → фон)
 * - Кэширование переводов в localStorage
 * - Батчинг запросов (экономия API квоты)
 * - Отслеживание прогресса
 * - Обработка ошибок с retry логикой
 *
 * Архитектура:
 * subtitlesStore → translationService → geminiApi → Gemini API
 */

import geminiAPI from './api/geminiApi.js';
import { useSubtitlesStore } from '../stores/subtitlesStore.js';

class TranslationService {
  constructor() {
    // Конфигурация
    this.config = {
      initialMinutes: 10, // Сколько минут переводить сразу
      batchSize: 50, // Размер батча (фраз в одном запросе)
      batchDelay: 500, // Задержка между батчами (мс)
      maxRetries: 3, // Количество повторных попыток при ошибке
      cacheVersion: 'v1', // Версия кэша (меняем при изменении формата)
      cacheExpireDays: 30, // Срок жизни кэша (дни)
    };

    // Состояние очереди
    this.queue = {
      isProcessing: false, // Идёт ли перевод сейчас
      currentBatchIndex: 0, // Текущий индекс батча
      totalBatches: 0, // Всего батчей
      isPaused: false, // Пауза перевода
      errors: [], // История ошибок
    };

    // Колбэки для UI (обновление прогресса)
    this.callbacks = {
      onProgress: null, // (progress: number) => void
      onComplete: null, // () => void
      onError: null, // (error: Error) => void
    };

    console.log('[TranslationService] Initialized');
  }

  /**
   * Главный метод: переводит массив субтитров
   *
   * @param {Array} subtitles - Массив субтитров из VTT [{start, end, text}, ...]
   * @param {Object} options - Настройки перевода
   * @returns {Promise<Object>} - Объект с переводами { index: "перевод" }
   *
   * Алгоритм:
   * 1. Проверяем кэш (может уже переводили этот файл?)
   * 2. Если есть кэш → возвращаем
   * 3. Если нет → переводим первые 10 минут
   * 4. Запускаем фоновый перевод остального
   */
  async translateSubtitles(subtitles, options = {}) {
    console.log('[TranslationService] Starting translation for', subtitles.length, 'subtitles');

    const {
      vttContent = '', // Контент VTT файла для кэширования
      onProgress = null, // Колбэк прогресса
      onComplete = null, // Колбэк завершения
      onError = null, // Колбэк ошибки
      forceRetranslate = false, // Игнорировать кэш и перевести заново
    } = options;

    // Сохраняем колбэки
    this.callbacks.onProgress = onProgress;
    this.callbacks.onComplete = onComplete;
    this.callbacks.onError = onError;

    try {
      // Шаг 1: Проверяем кэш
      if (!forceRetranslate && vttContent) {
        const cacheKey = this._calculateCacheKey(vttContent);
        const cached = this._getCachedTranslations(cacheKey);

        if (cached && cached.translations) {
          console.log('[TranslationService] Found cached translations!');

          const subtitlesStore = useSubtitlesStore();
          subtitlesStore.updateTranslations(cached.translations);

          console.log(
            '[TranslationService] Applied',
            Object.keys(cached.translations).length,
            'cached translations to store'
          );

          this._notifyProgress(100);
          this._notifyComplete();
          return cached.translations;
        }
      }

      // Шаг 2: Определяем батчи
      const initialBatchCount = this._getInitialBatchCount(subtitles);
      const totalBatches = Math.ceil(subtitles.length / this.config.batchSize);

      console.log(`[TranslationService] Will translate ${initialBatchCount}/${totalBatches} batches initially`);

      this.queue.totalBatches = totalBatches;
      this.queue.currentBatchIndex = 0;
      this.queue.isProcessing = true;
      this.queue.errors = [];

      // Шаг 3: Переводим первые 10 минут (приоритет)
      const translations = {};

      for (let i = 0; i < initialBatchCount; i++) {
        if (this.queue.isPaused) break;

        const batchTranslations = await this._processBatch(subtitles, i);
        Object.assign(translations, batchTranslations);

        this._notifyProgress(this._calculateProgress());

        // Задержка между батчами
        if (i < initialBatchCount - 1) {
          await this._delay(this.config.batchDelay);
        }
      }

      // Шаг 4: Сохраняем промежуточный результат в store
      const subtitlesStore = useSubtitlesStore();
      subtitlesStore.updateTranslations(translations);

      // Шаг 5: Запускаем фоновый перевод остального
      if (initialBatchCount < totalBatches) {
        console.log('[TranslationService] Starting background translation...');
        this._processBackgroundBatches(subtitles, initialBatchCount, translations, vttContent);
      } else {
        // Всё переведено сразу
        this._saveToCache(vttContent, translations);
        this._notifyComplete();
        this.queue.isProcessing = false;
      }

      return translations;
    } catch (error) {
      console.error('[TranslationService] Translation failed:', error);
      this._notifyError(error);
      this.queue.isProcessing = false;
      throw error;
    }
  }

  /**
   * Обрабатывает один батч субтитров
   *
   * @private
   * @param {Array} subtitles - Полный массив субтитров
   * @param {number} batchIndex - Индекс батча (0, 1, 2, ...)
   * @returns {Promise<Object>} - { index: "перевод" }
   */
  async _processBatch(subtitles, batchIndex) {
    const startIdx = batchIndex * this.config.batchSize;
    const endIdx = Math.min(startIdx + this.config.batchSize, subtitles.length);
    const batch = subtitles.slice(startIdx, endIdx);

    console.log(`[TranslationService] Processing batch ${batchIndex + 1}: items ${startIdx}-${endIdx}`);

    try {
      // Извлекаем только текст для перевода
      const texts = batch.map((sub) => sub.text);

      // Отправляем батч в Gemini API
      const translations = await geminiAPI.translateBatch(texts);

      // Формируем объект { index: "перевод" }
      const result = {};
      batch.forEach((subtitle, localIndex) => {
        const globalIndex = startIdx + localIndex;
        result[globalIndex] = translations[localIndex] || subtitle.text;
      });

      this.queue.currentBatchIndex = batchIndex + 1;

      return result;
    } catch (error) {
      console.error(`[TranslationService] Batch ${batchIndex} failed:`, error);

      // Добавляем в историю ошибок
      this.queue.errors.push({
        batchIndex,
        error: error.message,
        timestamp: Date.now(),
      });

      // Retry логика
      if (this.queue.errors.filter((e) => e.batchIndex === batchIndex).length < this.config.maxRetries) {
        console.warn(`[TranslationService] Retrying batch ${batchIndex}...`);
        await this._delay(2000); // Ждём 2 секунды перед повтором
        return this._processBatch(subtitles, batchIndex);
      }

      // Если все попытки исчерпаны - возвращаем оригиналы
      const result = {};
      batch.forEach((subtitle, localIndex) => {
        const globalIndex = startIdx + localIndex;
        result[globalIndex] = subtitle.text; // Оригинальный текст
      });

      return result;
    }
  }

  /**
   * Фоновая обработка оставшихся батчей
   * Работает асинхронно, не блокирует UI
   *
   * @private
   */
  async _processBackgroundBatches(subtitles, startBatchIndex, existingTranslations, vttContent) {
    const totalBatches = this.queue.totalBatches;
    const subtitlesStore = useSubtitlesStore();

    console.log('[TranslationService] Background translation started');

    try {
      for (let i = startBatchIndex; i < totalBatches; i++) {
        if (this.queue.isPaused) {
          console.log('[TranslationService] Background translation paused');
          break;
        }

        const batchTranslations = await this._processBatch(subtitles, i);
        Object.assign(existingTranslations, batchTranslations);

        // Обновляем store в реальном времени
        subtitlesStore.updateTranslations(existingTranslations);

        this._notifyProgress(this._calculateProgress());

        // Задержка между батчами
        if (i < totalBatches - 1) {
          await this._delay(this.config.batchDelay);
        }
      }

      // Всё готово!
      console.log('[TranslationService] Background translation completed');
      this._saveToCache(vttContent, existingTranslations);
      this._notifyComplete();
      this.queue.isProcessing = false;
    } catch (error) {
      console.error('[TranslationService] Background translation error:', error);
      this._notifyError(error);
      this.queue.isProcessing = false;
    }
  }

  /**
   * Вычисляет сколько батчей нужно перевести изначально (первые N минут)
   *
   * @private
   * @param {Array} subtitles - Массив субтитров
   * @returns {number} - Количество батчей
   */
  _getInitialBatchCount(subtitles) {
    const targetSeconds = this.config.initialMinutes * 60;

    // Находим индекс последнего субтитра в первых N минутах
    let lastIndex = subtitles.findIndex((sub) => sub.start > targetSeconds);

    if (lastIndex === -1) {
      // Весь файл меньше N минут
      lastIndex = subtitles.length;
    }

    // Вычисляем количество батчей
    const batchCount = Math.ceil(lastIndex / this.config.batchSize);

    return Math.max(1, batchCount); // Минимум 1 батч
  }

  /**
   * Вычисляет прогресс перевода (0-100%)
   *
   * @private
   * @returns {number}
   */
  _calculateProgress() {
    if (this.queue.totalBatches === 0) return 0;

    const progress = (this.queue.currentBatchIndex / this.queue.totalBatches) * 100;
    return Math.min(100, Math.round(progress));
  }

  /**
   * Вычисляет ключ кэша на основе VTT контента
   *
   * @private
   */
  _calculateCacheKey(vttContent) {
    if (!vttContent) {
      return null;
    }

    // ========== НОРМАЛИЗАЦИЯ VTT КОНТЕНТА ==========
    // Убираем лишние пробелы, переносы, приводим к единому виду
    const normalized = vttContent
      .replace(/\r\n/g, '\n') // Windows → Unix переносы
      .replace(/\r/g, '\n') // Mac → Unix переносы
      .replace(/\n{3,}/g, '\n\n') // Множественные переносы → двойные
      .replace(/\s+$/gm, '') // Убираем trailing пробелы с каждой строки
      .trim(); // Убираем пробелы с краёв всего текста
    // ================================================

    // Вычисляем hash от нормализованного контента
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Используем абсолютное значение для стабильности
    const positiveHash = Math.abs(hash);
    const cacheKey = `translation_v1_${positiveHash}`;

    console.log('[TranslationService] Cache key calculated:', cacheKey);

    return cacheKey;
  }

  /**
   * Получает переводы из localStorage
   *
   * @private
   * @param {string} cacheKey - Ключ кэша
   * @returns {Object|null} - { translations: {...}, timestamp: number }
   */
  _getCachedTranslations(cacheKey) {
    if (!cacheKey) return null;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);

      // Проверяем срок годности
      const now = Date.now();
      const age = now - data.timestamp;
      const maxAge = this.config.cacheExpireDays * 24 * 60 * 60 * 1000;

      if (age > maxAge) {
        console.log('[TranslationService] Cache expired, removing...');
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log('[TranslationService] Cache hit:', cacheKey);
      return data;
    } catch (error) {
      console.error('[TranslationService] Cache read error:', error);
      return null;
    }
  }

  /**
   * Сохраняет переводы в localStorage
   *
   * @private
   * @param {string} vttContent - Контент VTT для генерации ключа
   * @param {Object} translations - Объект с переводами
   */
  _saveToCache(vttContent, translations) {
    if (!vttContent) return;

    const cacheKey = this._calculateCacheKey(vttContent);
    if (!cacheKey) return;

    try {
      const data = {
        translations,
        timestamp: Date.now(),
        version: this.config.cacheVersion,
        count: Object.keys(translations).length,
      };

      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log('[TranslationService] Saved to cache:', cacheKey, `(${data.count} items)`);
    } catch (error) {
      // localStorage может быть заполнен - не критично
      console.warn('[TranslationService] Failed to save cache:', error.message);

      // Пытаемся очистить старый кэш
      this._cleanupOldCache();
    }
  }

  /**
   * Очищает устаревший кэш из localStorage
   *
   * @private
   */
  _cleanupOldCache() {
    try {
      const now = Date.now();
      const maxAge = this.config.cacheExpireDays * 24 * 60 * 60 * 1000;
      let removedCount = 0;

      // Проходим по всем ключам localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        // Только наши ключи
        if (!key.startsWith('translation_')) continue;

        try {
          const data = JSON.parse(localStorage.getItem(key));
          const age = now - data.timestamp;

          if (age > maxAge || data.version !== this.config.cacheVersion) {
            localStorage.removeItem(key);
            removedCount++;
          }
        } catch (e) {
          // Битый кэш - удаляем
          localStorage.removeItem(key);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        console.log(`[TranslationService] Cleaned up ${removedCount} old cache entries`);
      }
    } catch (error) {
      console.error('[TranslationService] Cache cleanup failed:', error);
    }
  }

  /**
   * Управление паузой/возобновлением перевода
   */
  pauseTranslation() {
    this.queue.isPaused = true;
    console.log('[TranslationService] Translation paused');
  }

  resumeTranslation() {
    this.queue.isPaused = false;
    console.log('[TranslationService] Translation resumed');
  }

  /**
   * Получить текущий статус перевода
   *
   * @returns {Object}
   */
  getStatus() {
    return {
      isProcessing: this.queue.isProcessing,
      isPaused: this.queue.isPaused,
      progress: this._calculateProgress(),
      currentBatch: this.queue.currentBatchIndex,
      totalBatches: this.queue.totalBatches,
      errors: this.queue.errors,
    };
  }

  /**
   * Очистить весь кэш переводов
   */
  clearAllCache() {
    try {
      let removedCount = 0;
      const keys = [];

      // Собираем ключи
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('translation_')) {
          keys.push(key);
        }
      }

      // Удаляем
      keys.forEach((key) => {
        localStorage.removeItem(key);
        removedCount++;
      });

      console.log(`[TranslationService] Cleared ${removedCount} cache entries`);
      return removedCount;
    } catch (error) {
      console.error('[TranslationService] Failed to clear cache:', error);
      return 0;
    }
  }

  // ==================== Утилиты ====================

  /**
   * Задержка выполнения
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Уведомить о прогрессе
   * @private
   */
  _notifyProgress(progress) {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(progress);
    }
  }

  /**
   * Уведомить о завершении
   * @private
   */
  _notifyComplete() {
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete();
    }
  }

  /**
   * Уведомить об ошибке
   * @private
   */
  _notifyError(error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }
}

// Экспортируем singleton инстанс
export default new TranslationService();
