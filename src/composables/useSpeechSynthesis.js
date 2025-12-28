// src/composables/useSpeechSynthesis.js

import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Композабл для управления синтезом речи (Web Speech API)
 *
 * Возможности:
 * - Загрузка доступных голосов ОС
 * - Озвучивание текста с настройками
 * - Динамический расчёт темпа речи
 * - Управление очередью (pause/resume/cancel)
 *
 * @returns {Object} API для работы с озвучкой
 */
export function useSpeechSynthesis() {
  const settingsStore = useSettingsStore();

  // ==========================================
  // СОСТОЯНИЕ
  // ==========================================

  /**
   * Все доступные голоса в системе
   */
  const availableVoices = ref([]);

  /**
   * Текущая озвучиваемая фраза (SpeechSynthesisUtterance)
   */
  const currentUtterance = ref(null);

  /**
   * Идёт ли озвучка прямо сейчас
   */
  const isSpeaking = ref(false);

  /**
   * Последний озвученный индекс субтитра (чтобы не повторять)
   */
  const lastSpokenIndex = ref(-1);

  // ==========================================
  // COMPUTED
  // ==========================================

  /**
   * Получить текущий выбранный голос (объект SpeechSynthesisVoice)
   */
  const selectedVoice = computed(() => {
    if (!settingsStore.selectedVoiceName) return null;

    return availableVoices.value.find((v) => v.name === settingsStore.selectedVoiceName) || null;
  });

  /**
   * Только русские голоса
   */
  const russianVoices = computed(() => {
    return availableVoices.value.filter((voice) => voice.lang.includes('ru') || voice.lang.includes('RU'));
  });

  /**
   * Есть ли доступные русские голоса
   */
  const hasRussianVoices = computed(() => russianVoices.value.length > 0);

  // ==========================================
  // ЗАГРУЗКА ГОЛОСОВ
  // ==========================================

  /**
   * Загружает список доступных голосов из системы
   *
   * Важно: голоса загружаются асинхронно!
   * На некоторых браузерах нужно дождаться события 'voiceschanged'
   */
  // function loadVoices() {
  //   const voices = speechSynthesis.getVoices();

  //   if (voices.length > 0) {
  //     availableVoices.value = voices;
  //     console.log('🎤 Загружено голосов:', voices.length);
  //     console.log('🇷🇺 Русских голосов:', russianVoices.value.length);

  //     // Если голос не выбран - выбираем первый русский
  //     if (!settingsStore.selectedVoice && russianVoices.value.length > 0) {
  //       settingsStore.selectedVoice = russianVoices.value[0];
  //       settingsStore.saveSettings();
  //       console.log('✅ Выбран голос по умолчанию:', settingsStore.selectedVoice.name);
  //     }
  //   }
  // }
  function loadVoices() {
    const voices = speechSynthesis.getVoices();

    if (voices.length > 0) {
      availableVoices.value = voices;
      console.log('🎤 Загружено голосов:', voices.length);
      console.log('🇷🇺 Русских голосов:', russianVoices.value.length);

      // Если имя голоса сохранено - находим его в списке
      if (settingsStore.selectedVoiceName) {
        const savedVoice = voices.find((v) => v.name === settingsStore.selectedVoiceName);

        if (savedVoice) {
          console.log('✅ Восстановлен голос:', savedVoice.name);
          // Сохраняем как computed свойство (см. ниже)
        } else {
          console.log('⚠️ Сохранённый голос не найден, выбираем новый');
          selectDefaultVoice();
        }
      } else {
        // Голос не выбран - выбираем первый русский
        selectDefaultVoice();
      }
    }
  }

  /**
   * Выбрать голос по умолчанию (первый русский)
   */
  function selectDefaultVoice() {
    if (russianVoices.value.length > 0) {
      settingsStore.selectedVoiceName = russianVoices.value[0].name;
      settingsStore.saveSettings();
      console.log('✅ Выбран голос по умолчанию:', russianVoices.value[0].name);
    }
  }

  // ==========================================
  // РАСЧЁТ ДИНАМИЧЕСКОГО ТЕМПА
  // ==========================================

  /**
   * Вычисляет оптимальный темп речи
   * НОВАЯ ЛОГИКА: всегда возвращаем фиксированный rate из настроек
   * Динамика теперь через playbackRate видео!
   *
   * @param {string} text - Текст для озвучки
   * @param {number} duration - Длительность в секундах
   * @returns {number} - Темп речи (фиксированный)
   */
  function calculateOptimalRate(text, duration) {
    // Просто возвращаем rate из настроек
    // Больше НЕ вычисляем динамически!
    return settingsStore.voiceRate;
  }

  // ==========================================
  // ОСНОВНЫЕ МЕТОДЫ
  // ==========================================

  /**
   * Озвучить текст
   *
   * @param {string} text - Текст для озвучки
   * @param {Object} options - Опции
   * @param {number} options.duration - Длительность субтитра (секунды)
   * @param {number} options.index - Индекс субтитра
   */
  function speak(text, options = {}) {
    const { duration = 3, timeRemaining = duration, index = -1, onSpeechStart = null, onSpeechEnd = null } = options;

    if (!settingsStore.isDubbingEnabled) return;
    if (!text || text.trim().length === 0) return;
    if (lastSpokenIndex.value === index) return;

    if (window.speechSynthesis.speaking) {
      if (timeRemaining < 2.0) {
        console.log('⏭️ Пропуск: слишком мало времени');
        return;
      }

      window.speechSynthesis.cancel();

      setTimeout(() => {
        actuallySpeak(text, duration, timeRemaining, index, { onSpeechStart, onSpeechEnd });
      }, 50);
    } else {
      actuallySpeak(text, duration, timeRemaining, index, { onSpeechStart, onSpeechEnd });
    }
  }
  /**
   * Внутренняя функция для реальной озвучки
   */
  function actuallySpeak(text, duration, timeRemaining, index, callbacks = {}) {
    const { onSpeechStart, onSpeechEnd } = callbacks; // ← уже есть
    const utterance = new SpeechSynthesisUtterance(text);

    // ФИКСИРОВАННЫЙ ТЕМП из настроек
    utterance.rate = settingsStore.voiceRate;
    utterance.pitch = settingsStore.voicePitch;
    utterance.volume = settingsStore.voiceVolume / 100;
    utterance.lang = 'ru-RU';

    const voice = selectedVoice.value;
    if (voice) {
      utterance.voice = voice;
    }

    // Логи
    console.log('🎤 Озвучка:', {
      text: text.substring(0, 40) + '...',
      rate: utterance.rate.toFixed(2),
      volume: utterance.volume.toFixed(2),
      voiceName: voice ? voice.name : 'default',
      textLength: text.length,
      duration: duration.toFixed(1) + 's',
    });

    // События
    utterance.onstart = () => {
      isSpeaking.value = true;
      currentUtterance.value = utterance;
      lastSpokenIndex.value = index;

      // ИСПРАВЛЕНО: используем onSpeechStart из callbacks
      if (onSpeechStart) {
        onSpeechStart({
          textLength: text.length,
          duration: duration,
          rate: utterance.rate,
        });
      }

      console.log(`✅ Озвучка началась: "${text.substring(0, 30)}..."`);
    };

    utterance.onend = () => {
      isSpeaking.value = false;
      currentUtterance.value = null;

      // ИСПРАВЛЕНО: используем onSpeechEnd из callbacks
      if (onSpeechEnd) {
        onSpeechEnd();
      }

      console.log('✅ Озвучка завершена');
    };

    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') {
        console.log('🔄 Озвучка прервана');
        isSpeaking.value = false;
        currentUtterance.value = null;

        // ИСПРАВЛЕНО: используем onSpeechEnd из callbacks
        if (onSpeechEnd) {
          onSpeechEnd();
        }
        return;
      }

      console.error('❌ Ошибка озвучки:', event.error);
      isSpeaking.value = false;
      currentUtterance.value = null;
    };

    window.speechSynthesis.speak(utterance);
    console.log('▶️ speak() вызван');
  }

  /**
   * Отменить текущую озвучку
   */
  function cancel() {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      isSpeaking.value = false;
      currentUtterance.value = null;
      console.log('🛑 Озвучка отменена');
    }
  }

  /**
   * Приостановить озвучку
   */
  function pause() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      console.log('⏸️ Озвучка приостановлена');
    }
  }

  /**
   * Возобновить озвучку
   */
  function resume() {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      console.log('▶️ Озвучка возобновлена');
    }
  }

  /**
   * Сбросить состояние (при перемотке)
   */
  function reset() {
    cancel();
    lastSpokenIndex.value = -1;
  }

  // ==========================================
  // LIFECYCLE
  // ==========================================

  onMounted(() => {
    // Загружаем голоса при монтировании
    loadVoices();

    // Подписываемся на событие загрузки голосов
    // (на некоторых браузерах голоса загружаются асинхронно)
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  });

  // ==========================================
  // PUBLIC API
  // ==========================================

  return {
    // Состояние
    availableVoices,
    russianVoices,
    hasRussianVoices,
    isSpeaking,
    lastSpokenIndex,
    selectedVoice,

    // Методы
    speak,
    cancel,
    pause,
    resume,
    reset,
    loadVoices,
  };
}
