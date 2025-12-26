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
        <div class="list-scroll">
          <div v-for="subtitle in subtitlesStore.items" :key="subtitle.id" class="subtitle-item">
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
              {{ subtitle.translation || '[перевод появится позже]' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSubtitlesStore } from '../stores/subtitlesStore';
import { formatTime } from '../utils/timeFormatter';

// Получаем store
const subtitlesStore = useSubtitlesStore();

// Локальное состояние видимости сайдбара
const isVisible = ref(false);

/**
 * Переключает видимость сайдбара
 */
function toggleSidebar() {
  isVisible.value = !isVisible.value;
}
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
  color: #718096;
  font-style: italic;
}
</style>
