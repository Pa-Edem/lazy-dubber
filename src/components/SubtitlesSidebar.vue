<!-- // src/components/SubtitlesSidebar.vue -->

<template>
  <div class="subtitles-sidebar">
    <!-- Кнопка показать/скрыть -->
    <button class="toggle-button" @click="toggleSidebar" :class="{ 'sidebar-hidden': !isVisible }">
      {{ isVisible ? '← Скрыть субтитры' : 'Показать субтитры →' }}
    </button>

    <!-- Сайдбар с субтитрами -->
    <div v-show="isVisible" class="sidebar-content">
      <!-- Состояние: Загрузка -->
      <div v-if="subtitlesStore.isLoading" class="state-container">
        <div class="spinner"></div>
        <p>Парсинг субтитров...</p>
      </div>

      <!-- Состояние: Ошибка -->
      <div v-else-if="subtitlesStore.hasError" class="state-container error">
        <p class="error-icon">⚠️</p>
        <p class="error-text">{{ subtitlesStore.error }}</p>
      </div>

      <!-- Состояние: Пусто -->
      <div v-else-if="!subtitlesStore.hasSubtitles" class="state-container">
        <p class="empty-text">Загрузите VTT файл</p>
      </div>

      <!-- Состояние: Список субтитров -->
      <div v-else class="subtitles-list">
        <!-- Заголовок с информацией -->
        <div class="list-header">
          <span class="subtitle-count"> {{ subtitlesStore.totalCount }} субтитров </span>
          <span class="duration">
            {{ subtitlesStore.formattedDuration }}
          </span>
        </div>

        <!-- Скроллируемый список -->
        <div class="list-scroll" ref="listScroll">
          <div
            v-for="(subtitle, index) in subtitlesStore.items"
            :key="subtitle.id"
            :ref="(el) => setSubtitleRef(el, index)"
            class="subtitle-item"
            :class="{
              active: index === playerStore.currentSubtitleIndex,
              clickable: true,
            }"
            @click="onSubtitleClick(index)"
          >
            <!-- Временная метка -->
            <div class="timestamp">
              {{ formatTime(subtitle.startTime) }}
            </div>
            <!-- Оригинальный текст -->
            <div class="original-text">
              {{ subtitle.text }}
            </div>
            <!-- Разделитель -->
            <div class="divider"></div>
            <!-- Место для перевода -->
            <div class="translation-text">
              <template v-if="getTranslation(index)"> 🇷🇺 {{ getTranslation(index) }} </template>
              <template v-else-if="subtitlesStore.isTranslating">
                <span class="loading-indicator">⏳ Перевод...</span>
              </template>
              <template v-else>
                <span class="pending-translation">[Перевод появится позже]</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { usePlayerStore } from '../stores/playerStore';
import { useSubtitlesStore } from '../stores/subtitlesStore';
import { formatTime } from '../utils/timeFormatter';

// Получаем store
const subtitlesStore = useSubtitlesStore();
// Получаем playerStore для синхронизации
const playerStore = usePlayerStore();

/**
 * Ref на контейнер прокрутки
 * Используется для автопрокрутки к активному субтитру
 */
const listScroll = ref(null);

/**
 * Массив refs на элементы субтитров
 * Каждый элемент списка получит свой ref
 */
const subtitleRefs = ref([]);

// Локальное состояние видимости сайдбара
const isVisible = ref(false);

/**
 * Переключает видимость сайдбара
 */
function toggleSidebar() {
  isVisible.value = !isVisible.value;
}

/**
 * Устанавливаем ref для элемента субтитра
 * Вызывается из template через :ref="..."
 */
function setSubtitleRef(el, index) {
  if (el) {
    subtitleRefs.value[index] = el;
  }
}

/**
 * Обработчик клика по субтитру
 * Перематывает видео на начало этого субтитра
 */
function onSubtitleClick(index) {
  const subtitle = subtitlesStore.items[index];

  if (!subtitle) {
    console.warn('Субтитр не найден');
    return;
  }

  // Напрямую используем playerStore для перемотки
  playerStore.seekTo(subtitle.startTime);

  console.log(`🎯 Переход к субтитру #${index} (время: ${subtitle.startTime})`);
}

/**
 * Получить перевод для субтитра по индексу
 */
function getTranslation(index) {
  return subtitlesStore.getTranslation(index);
}

/**
 * Автоматическая прокрутка к активному субтитру
 * Срабатывает при изменении currentSubtitleIndex
 */
watch(
  () => playerStore.currentSubtitleIndex,
  (newIndex) => {
    if (newIndex === -1) return; // Нет активного субтитра

    // Ждём следующий тик Vue для обновления DOM
    nextTick(() => {
      const activeElement = subtitleRefs.value[newIndex];

      if (activeElement && listScroll.value) {
        // Прокручиваем так, чтобы элемент был в центре видимой области
        activeElement.scrollIntoView({
          behavior: 'smooth', // Плавная прокрутка
          block: 'center', // Элемент в центре экрана
          inline: 'nearest', // Не прокручивать по горизонтали
        });
      }
    });
  }
);
</script>

<style scoped>
/* Контейнер всего компонента */
.subtitles-sidebar {
  position: relative;
}

/* Кнопка переключения */
.toggle-button {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background-color: #4a5568;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
  z-index: 100;
}

.toggle-button:hover {
  background-color: #2d3748;
}

.toggle-button.sidebar-hidden {
  background-color: #4a5568;
}

.toggle-button.sidebar-hidden:hover {
  background-color: #2d3748;
}

/* Основной контейнер сайдбара */
.sidebar-content {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 400px;
  height: calc(100vh - 90px);
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 50;
}

/* Контейнеры для состояний (загрузка, ошибка, пусто) */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  color: #718096;
}

/* Спиннер загрузки */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3182ce;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-indicator {
  color: #a0aec0;
  font-size: 13px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Ожидание перевода */
.pending-translation {
  color: #cbd5e0;
  font-size: 13px;
}

/* Состояние ошибки */
.state-container.error {
  color: #e53e3e;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  font-size: 14px;
  line-height: 1.5;
}

/* Пустое состояние */
.empty-text {
  font-size: 16px;
  color: #a0aec0;
}

/* Контейнер списка субтитров */
.subtitles-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Заголовок списка */
.list-header {
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #4a5568;
}

/* Скроллируемая область */
.list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Стилизация скроллбара */
.list-scroll::-webkit-scrollbar {
  width: 8px;
}

.list-scroll::-webkit-scrollbar-track {
  background: #f7fafc;
}

.list-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.list-scroll::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Элемент субтитра */
.subtitle-item {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.subtitle-item:last-child {
  border-bottom: none;
}

/* Временная метка */
.timestamp {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #3182ce;
  font-weight: 600;
  margin-bottom: 8px;
}

/* Оригинальный текст */
.original-text {
  font-size: 14px;
  line-height: 1.6;
  color: #2d3748;
  margin-bottom: 8px;
}

/* Разделитель */
.divider {
  height: 1px;
  background-color: #edf2f7;
  margin: 8px 0;
}

/* Текст перевода */
.translation-text {
  font-size: 14px;
  line-height: 1.6;
  color: #001d4a;
  font-style: italic;
}
/* ==========================================
   АКТИВНЫЙ СУБТИТР (ПОДСВЕТКА)
   ========================================== */

.subtitle-item.active {
  background-color: #ebf8ff; /* Светло-голубой фон */
  border-left: 4px solid #3182ce; /* Синяя полоска слева */
  padding-left: 12px; /* Компенсация за border */
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(49, 130, 206, 0.1);
}

.subtitle-item.active .timestamp {
  color: #2c5282; /* Более тёмный синий для времени */
  font-weight: 700;
}

.subtitle-item.active .original-text {
  color: #1a202c; /* Чёрный текст для лучшей читаемости */
  font-weight: 500;
}

/* ==========================================
   КЛИКАБЕЛЬНЫЙ СУБТИТР
   ========================================== */

.subtitle-item.clickable {
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.subtitle-item.clickable:hover {
  background-color: #f7fafc;
  transform: translateX(4px); /* Лёгкий сдвиг при наведении */
}

/* Активный + hover */
.subtitle-item.active.clickable:hover {
  background-color: #bee3f8; /* Чуть темнее при наведении */
}

/* ==========================================
   АНИМАЦИЯ ПОЯВЛЕНИЯ АКТИВНОГО
   ========================================== */

@keyframes highlight {
  0% {
    background-color: #bee3f8;
  }
  100% {
    background-color: #ebf8ff;
  }
}

.subtitle-item.active {
  animation: highlight 0.5s ease;
}
</style>
