// src/services/api/geminiApi.js

/**
 * Сервис для работы с Gemini API (Google AI)
 *
 * Основные возможности:
 * - Перевод текста с английского на русский
 * - Батч-перевод (много фраз за один запрос)
 * - Обработка ошибок и retry логика
 *
 * Документация API: https://ai.google.dev/api/rest
 */

class GeminiTranslateAPI {
  /**
   * Конструктор класса
   * @param {string} apiKey - API ключ от Google AI Studio
   * @param {string} model - Название модели (опционально)
   */
  constructor(apiKey, model = null) {
    // Проверяем, что ключ передан
    if (!apiKey) {
      throw new Error('Gemini API key is required! Check your .env file.');
    }

    this.apiKey = apiKey;

    // Выбираем модель из .env или используем по умолчанию
    const modelName = model || import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

    // Базовый URL для Gemini API
    this.baseURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    console.log(`[GeminiAPI] Using model: ${modelName}`);

    // Настройки для запросов
    this.config = {
      maxRetries: 3, // Сколько раз повторять при ошибке
      retryDelay: 1000, // Задержка между попытками (мс)
      timeout: 30000, // Таймаут запроса (30 сек)
      maxBatchSize: 25, // Максимум фраз в одном запросе
    };
  }

  /**
   * Переводит массив текстов с английского на русский (БАТЧ)
   *
   * @param {string[]} texts - Массив текстов для перевода
   * @returns {Promise<string[]>} - Массив переведённых текстов
   *
   * Пример:
   * translateBatch(['Hello', 'World']) → ['Привет', 'Мир']
   */
  async translateBatch(texts) {
    // Валидация входных данных
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('texts must be a non-empty array');
    }

    // Фильтруем пустые строки
    const validTexts = texts.filter((text) => text && text.trim());

    if (validTexts.length === 0) {
      return texts.map(() => ''); // Вернуть пустые строки
    }

    // Если текстов слишком много - разбиваем на части
    if (validTexts.length > this.config.maxBatchSize) {
      return this._translateInChunks(validTexts);
    }

    try {
      // Формируем промпт для Gemini
      const prompt = this._buildTranslationPrompt(validTexts);

      // Отправляем запрос к API
      const response = await this._makeRequest(prompt);

      // Парсим ответ и возвращаем переводы
      return this._parseTranslationResponse(response, validTexts.length);
    } catch (error) {
      console.error('[GeminiAPI] Translation failed:', error);

      // В случае ошибки возвращаем оригинальные тексты
      // (чтобы приложение не сломалось)
      return validTexts;
    }
  }

  /**
   * Переводит один текст
   *
   * @param {string} text - Текст для перевода
   * @returns {Promise<string>} - Переведённый текст
   */
  async translateSingle(text) {
    if (!text || !text.trim()) {
      return '';
    }

    const results = await this.translateBatch([text]);
    return results[0];
  }

  /**
   * Формирует промпт для Gemini API
   *
   * Почему такой промпт?
   * - Чёткие инструкции для модели
   * - Формат JSON для надёжного парсинга
   * - Контекст: это субтитры из фильма (для естественного перевода)
   *
   * @private
   */
  _buildTranslationPrompt(texts) {
    // Отправляем субтитры как JSON массив
    const inputJSON = JSON.stringify(texts, null, 2);

    return `You are a professional translator specializing in subtitles for programming tutorials.

TASK: Translate these English subtitles to Russian.

INPUT (JSON array):
${inputJSON}

RULES:
1. Return ONLY a JSON array with translations
2. Keep the EXACT same number of items (${texts.length} items)
3. Preserve the order
4. Keep translations natural and conversational
5. Do NOT add markdown, explanations, or extra text

OUTPUT FORMAT:
["перевод 1", "перевод 2", ...]

Translate NOW:`;
  }

  /**
   * Выполняет HTTP запрос к Gemini API с retry логикой
   *
   * @private
   */
  async _makeRequest(prompt, retryCount = 0) {
    const url = `${this.baseURL}?key=${this.apiKey}`;

    // Тело запроса для Gemini API
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3, // Низкая температура = более точный перевод
        maxOutputTokens: 8192, // Максимум токенов в ответе
        topP: 0.8,
        topK: 10,
      },
    };

    try {
      // Отправляем POST запрос
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.config.timeout), // Таймаут
      });

      // Проверяем статус ответа
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      // Парсим JSON ответ
      const data = await response.json();
      return data;
    } catch (error) {
      // Retry логика при ошибке
      if (retryCount < this.config.maxRetries) {
        console.warn(`[GeminiAPI] Request failed, retrying... (${retryCount + 1}/${this.config.maxRetries})`);

        // Ждём перед повторной попыткой
        await this._delay(this.config.retryDelay * (retryCount + 1));

        // Рекурсивно повторяем запрос
        return this._makeRequest(prompt, retryCount + 1);
      }

      // Если все попытки исчерпаны - пробрасываем ошибку
      throw error;
    }
  }

  /**
   * Пытается восстановить обрезанный JSON массив
   *
   * @private
   */
  _fixTruncatedJSON(text) {
    let fixed = text.trim();

    // Если нет закрывающей скобки - добавляем
    if (!fixed.endsWith(']')) {
      // Находим последнюю завершенную строку
      const lastCompleteQuote = fixed.lastIndexOf('"');
      if (lastCompleteQuote !== -1) {
        // Обрезаем до последней полной строки
        fixed = fixed.substring(0, lastCompleteQuote + 1);

        // Добавляем закрывающую скобку
        if (!fixed.endsWith(']')) {
          fixed += ']';
        }
      }
    }

    return fixed;
  }

  /**
   * Парсит ответ от Gemini API и извлекает переводы
   *
   * @private
   */
  _parseTranslationResponse(response, expectedCount) {
    try {
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      // Сохраняем для отладки
      window.__lastGeminiResponse = text;
      console.log('[GeminiAPI] Response length:', text.length, 'chars');
      console.log('[GeminiAPI] Check full response: window.__lastGeminiResponse');

      let cleanedText = text.trim();
      cleanedText = this._fixTruncatedJSON(cleanedText);

      // Удаляем markdown обёртку
      cleanedText = cleanedText.replace(/```json\s*/g, '');
      cleanedText = cleanedText.replace(/```\s*/g, '');
      cleanedText = cleanedText.trim();

      let translations;

      // ========== УЛУЧШЕННЫЙ ПАРСИНГ ==========

      // Попытка 1: Прямой JSON.parse
      try {
        translations = JSON.parse(cleanedText);
        console.log('[GeminiAPI] ✅ JSON parse success!', translations.length, 'items');

        if (Array.isArray(translations) && translations.length > 0) {
          // Успех! Gemini вернул правильный JSON
          return this._validateAndPadTranslations(translations, expectedCount);
        }
      } catch (jsonError) {
        console.warn('[GeminiAPI] JSON parse failed:', jsonError.message);
      }

      // Попытка 2: Исправляем возможные проблемы с экранированием
      try {
        // Пробуем удалить лишние экранирования
        let fixed = cleanedText
          .replace(/\\n/g, ' ') // Заменяем \n на пробелы
          .replace(/\s+/g, ' ') // Схлопываем множественные пробелы
          .replace(/\\ "/g, '"'); // Исправляем \ " на "

        translations = JSON.parse(fixed);
        console.log('[GeminiAPI] ✅ Fixed JSON parse success!', translations.length, 'items');

        if (Array.isArray(translations) && translations.length > 0) {
          return this._validateAndPadTranslations(translations, expectedCount);
        }
      } catch (fixedError) {
        console.warn('[GeminiAPI] Fixed JSON parse failed:', fixedError.message);
      }

      // Попытка 3: Regex извлечение (улучшенная версия)
      console.warn('[GeminiAPI] Trying advanced regex extraction...');
      translations = this._extractTranslationsAdvanced(cleanedText);

      if (translations.length > 0) {
        console.log('[GeminiAPI] ✅ Regex extraction success!', translations.length, 'items');
        return this._validateAndPadTranslations(translations, expectedCount);
      }

      // Все методы провалились
      throw new Error('All parsing methods failed');
    } catch (error) {
      console.error('[GeminiAPI] Failed to parse response:', error);
      console.error('[GeminiAPI] Check: window.__lastGeminiResponse');

      // Возвращаем заглушки
      return Array(expectedCount).fill('[Translation error]');
    }
  }

  /**
   * Продвинутое извлечение переводов с помощью regex
   *
   * @private
   */
  _extractTranslationsAdvanced(text) {
    const translations = [];

    // Метод 1: Ищем массив и извлекаем элементы
    // Паттерн: [ "текст1", "текст2", ... ]

    // Находим начало массива
    const arrayStartMatch = text.match(/\[/);
    if (!arrayStartMatch) {
      console.warn('[GeminiAPI] No array start found');
      return translations;
    }

    // Обрезаем до начала массива
    let arrayText = text.substring(arrayStartMatch.index);

    // Находим конец массива
    const arrayEndMatch = arrayText.match(/\]/);
    if (arrayEndMatch) {
      arrayText = arrayText.substring(0, arrayEndMatch.index + 1);
    }

    // Пробуем парсить как JSON
    try {
      const parsed = JSON.parse(arrayText);
      if (Array.isArray(parsed)) {
        console.log('[GeminiAPI] Extracted array from text:', parsed.length, 'items');
        return parsed;
      }
    } catch (e) {
      // Продолжаем с другими методами
    }

    // Метод 2: Извлекаем все строки в кавычках
    // Паттерн: "любой текст включая, запятые и \"экранированные кавычки\""
    const stringRegex = /"((?:[^"\\]|\\.)*)"/g;
    let match;

    while ((match = stringRegex.exec(text)) !== null) {
      const str = match[1]
        .replace(/\\"/g, '"') // Убираем экранирование кавычек
        .replace(/\\n/g, '\n') // Преобразуем \n в реальные переносы
        .replace(/\\\\/g, '\\') // Убираем двойные слэши
        .replace(/\\t/g, '\t'); // Табуляции

      // Фильтруем слишком короткие строки (вероятно мусор)
      if (str.trim().length > 2) {
        translations.push(str.trim());
      }
    }

    return translations;
  }

  /**
   * Валидирует массив переводов и дополняет/обрезает до нужного размера
   *
   * @private
   */
  _validateAndPadTranslations(translations, expectedCount) {
    if (!Array.isArray(translations)) {
      console.error('[GeminiAPI] Result is not an array:', typeof translations);
      return Array(expectedCount).fill('[Translation error]');
    }

    if (translations.length === expectedCount) {
      // Идеально!
      return translations;
    }

    if (translations.length < expectedCount) {
      // Недостаточно переводов - дополняем
      console.warn(`[GeminiAPI] Got ${translations.length}/${expectedCount} translations, padding...`);
      const missing = expectedCount - translations.length;
      return [...translations, ...Array(missing).fill('[Translation pending]')];
    }

    // Слишком много переводов - обрезаем
    console.warn(`[GeminiAPI] Got ${translations.length}/${expectedCount} translations, trimming...`);
    return translations.slice(0, expectedCount);
  }

  /**
   * Парсит ответ построчно (fallback метод)
   *
   * @private
   */
  // _parseLineByLine(text) {
  //   // Ищем строки вида:
  //   // 1. "Перевод первой строки"
  //   // 2. "Перевод второй строки"

  //   const lines = text.split('\n');
  //   const translations = [];

  //   for (const line of lines) {
  //     const match = line.match(/^\d+\.\s*["'](.+)["']\s*$/);
  //     if (match) {
  //       translations.push(match[1]);
  //     }
  //   }

  //   if (translations.length === 0) {
  //     throw new Error('No translations found in line-by-line parse');
  //   }

  //   console.log('[GeminiAPI] Line-by-line parse successful:', translations.length, 'items');
  //   return translations;
  // }

  /**
   * Извлекает переводы через regex (последний fallback)
   *
   * @private
   */
  // _extractWithRegex(text, expectedCount) {
  //   // Ищем все строки в кавычках
  //   const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
  //   const matches = [];
  //   let match;

  //   while ((match = regex.exec(text)) !== null) {
  //     matches.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
  //   }

  //   if (matches.length === 0) {
  //     throw new Error('No translations found with regex');
  //   }

  //   console.log('[GeminiAPI] Regex extraction successful:', matches.length, 'items');
  //   return matches.slice(0, expectedCount);
  // }

  /**
   * Разбивает большой массив на части и переводит по частям
   *
   * @private
   */
  async _translateInChunks(texts) {
    const chunks = [];
    const chunkSize = this.config.maxBatchSize;

    // Разбиваем на куски
    for (let i = 0; i < texts.length; i += chunkSize) {
      chunks.push(texts.slice(i, i + chunkSize));
    }

    console.log(`[GeminiAPI] Translating ${texts.length} texts in ${chunks.length} chunks`);

    // Переводим каждый кусок последовательно
    const results = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[GeminiAPI] Processing chunk ${i + 1}/${chunks.length}`);

      const chunkTranslations = await this.translateBatch(chunks[i]);
      results.push(...chunkTranslations);

      // Задержка между запросами (чтобы не превысить rate limit)
      if (i < chunks.length - 1) {
        await this._delay(500); // 500ms между батчами
      }
    }

    return results;
  }

  /**
   * Вспомогательная функция задержки
   *
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Проверка работоспособности API
   * Полезно для отладки
   */
  async healthCheck() {
    try {
      const result = await this.translateSingle('Hello');
      console.log('[GeminiAPI] Health check:', result);
      return result === 'Привет' || result.includes('Привет');
    } catch (error) {
      console.error('[GeminiAPI] Health check failed:', error);
      return false;
    }
  }
}

// Создаём singleton инстанс
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const model = import.meta.env.VITE_GEMINI_MODEL;
const geminiAPI = new GeminiTranslateAPI(apiKey, model);

// Экспортируем как default и named export
export default geminiAPI;
export { GeminiTranslateAPI };
