<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <!-- Заголовок -->
          <div class="modal-header">
            <h2>⚙️ Настройки озвучки</h2>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>

          <!-- Контент -->
          <div class="modal-body">
            <!-- Выбор голоса -->
            <div class="setting-group">
              <label class="setting-label">Голос:</label>
              <select v-model="selectedVoiceName" class="voice-select" @change="onVoiceChange">
                <option value="">Выберите голос</option>
                <option v-for="voice in russianVoices" :key="voice.name" :value="voice.name">
                  {{ voice.name }}
                </option>
              </select>
            </div>

            <!-- Скорость -->
            <div class="setting-group">
              <label class="setting-label">
                Скорость:
                <span class="setting-value">
                  {{ autoAdjustRate ? 'Авто' : `${voiceRate}x` }}
                </span>
              </label>

              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" v-model="autoAdjustRate" :value="true" />
                  Авто
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="autoAdjustRate" :value="false" />
                  Ручная
                </label>
              </div>

              <input
                v-if="!autoAdjustRate"
                type="range"
                v-model.number="voiceRate"
                min="0.75"
                max="1.5"
                step="0.05"
                class="slider"
              />
            </div>

            <!-- Тональность -->
            <div class="setting-group">
              <label class="setting-label">
                Тональность:
                <span class="setting-value">{{ voicePitch.toFixed(2) }}</span>
              </label>
              <input type="range" v-model.number="voicePitch" min="0.8" max="1.2" step="0.05" class="slider" />
            </div>

            <!-- Громкость голоса -->
            <div class="setting-group">
              <label class="setting-label">
                Громкость голоса:
                <span class="setting-value">{{ voiceVolume }}%</span>
              </label>
              <input type="range" v-model.number="voiceVolume" min="50" max="100" step="5" class="slider" />
            </div>

            <!-- Приглушение видео -->
            <div class="setting-group">
              <label class="setting-label">
                Приглушение видео:
                <span class="setting-value">{{ duckingLevel }}%</span>
              </label>
              <input type="range" v-model.number="duckingLevel" min="10" max="50" step="5" class="slider" />
            </div>

            <!-- Кнопка теста -->
            <button class="test-btn" @click="testVoice" :disabled="!selectedVoiceName">🎤 Прослушать голос</button>
          </div>

          <!-- Футер -->
          <div class="modal-footer">
            <button class="btn-secondary" @click="resetToDefaults">Сбросить</button>
            <button class="btn-primary" @click="saveAndClose">Сохранить</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';
import { useSpeechSynthesis } from '../composables/useSpeechSynthesis';

const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(['close']);

const settingsStore = useSettingsStore();
const speechSynthesis = useSpeechSynthesis();

// Локальные копии настроек
const selectedVoiceName = ref(settingsStore.selectedVoiceName);
const voiceRate = ref(settingsStore.voiceRate);
const voicePitch = ref(settingsStore.voicePitch);
const voiceVolume = ref(settingsStore.voiceVolume);
const autoAdjustRate = ref(settingsStore.autoAdjustRate);
const duckingLevel = ref(settingsStore.duckingLevel);

// Русские голоса
const russianVoices = computed(() => speechSynthesis.russianVoices.value);

/**
 * Изменение голоса
 */
function onVoiceChange() {
  console.log('Выбран голос:', selectedVoiceName.value);
}

/**
 * Тест голоса
 */
function testVoice() {
  const testText = 'Привет! Это тестовая фраза для проверки выбранного голоса.';

  // Отменяем предыдущую озвучку если есть
  window.speechSynthesis.cancel();

  // Создаём utterance напрямую
  const utterance = new SpeechSynthesisUtterance(testText);

  // Применяем настройки из формы
  utterance.rate = autoAdjustRate.value ? 1.0 : voiceRate.value;
  utterance.pitch = voicePitch.value;
  utterance.volume = voiceVolume.value / 100;
  utterance.lang = 'ru-RU';

  // Находим выбранный голос
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find((v) => v.name === selectedVoiceName.value);

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  // Логи для отладки
  console.log('🎤 Тест голоса:', {
    text: testText,
    voiceName: selectedVoice ? selectedVoice.name : 'НЕ НАЙДЕН',
    rate: utterance.rate,
    pitch: utterance.pitch,
    volume: utterance.volume,
  });

  // События
  utterance.onstart = () => {
    console.log('▶️ Тест голоса начался');
  };

  utterance.onend = () => {
    console.log('✅ Тест голоса завершён');
  };

  utterance.onerror = (event) => {
    console.error('❌ Ошибка теста голоса:', event.error);
  };

  // Запускаем
  window.speechSynthesis.speak(utterance);
}

/**
 * Сброс к дефолтным значениям
 */
function resetToDefaults() {
  voiceRate.value = 1.0;
  voicePitch.value = 1.0;
  voiceVolume.value = 100;
  autoAdjustRate.value = true;
  duckingLevel.value = 20;
}

/**
 * Сохранить и закрыть
 */
function saveAndClose() {
  // Сохраняем в store
  settingsStore.selectedVoiceName = selectedVoiceName.value;
  settingsStore.voiceRate = voiceRate.value;
  settingsStore.voicePitch = voicePitch.value;
  settingsStore.voiceVolume = voiceVolume.value;
  settingsStore.autoAdjustRate = autoAdjustRate.value;
  settingsStore.duckingLevel = duckingLevel.value;

  settingsStore.saveSettings();

  closeModal();
}

/**
 * Закрыть модалку
 */
function closeModal() {
  emit('close');
}

// Автосохранение при изменении настроек
watch(
  [voiceRate, voicePitch, voiceVolume, duckingLevel, autoAdjustRate],
  () => {
    // Сохраняем в store в реальном времени
    settingsStore.voiceRate = voiceRate.value;
    settingsStore.voicePitch = voicePitch.value;
    settingsStore.voiceVolume = voiceVolume.value;
    settingsStore.duckingLevel = duckingLevel.value;
    settingsStore.autoAdjustRate = autoAdjustRate.value;

    // Сохраняем в localStorage
    settingsStore.saveSettings();
  },
  { deep: true }
);
</script>

<style scoped>
/* Оверлей */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* Контейнер модалки */
.modal-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

/* Заголовок */
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1a202c;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #718096;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f7fafc;
}

/* Тело */
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* Группа настройки */
.setting-group {
  margin-bottom: 24px;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.setting-value {
  float: right;
  color: #4a5568;
  font-weight: 400;
}

/* Выбор голоса */
.voice-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 14px;
  color: #2d3748;
  background: white;
  cursor: pointer;
}

/* Радио-кнопки */
.radio-group {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
}

/* Слайдеры */
.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3182ce;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3182ce;
  cursor: pointer;
  border: none;
}

/* Кнопка теста */
.test-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 8px;
}

.test-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Футер */
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #f7fafc;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #edf2f7;
}

.btn-primary {
  background: #3182ce;
  color: white;
}

.btn-primary:hover {
  background: #2c5282;
}

/* Анимация */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
