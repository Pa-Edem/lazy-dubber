<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Лого и название -->
      <div class="header-left">
        <h1 class="app-title">Lazy Dubber</h1>
      </div>

      <!-- Кнопки справа -->
      <div class="header-right">
        <!-- Кнопка показать/скрыть субтитры -->
        <button
          class="toggle-btn"
          @click="toggleSubtitles"
          :title="subtitlesVisible ? 'Скрыть субтитры' : 'Показать субтитры'"
        >
          {{ subtitlesVisible ? '📖 Скрыть субтитры' : '📕 Показать субтитры' }}
        </button>

        <!-- Кнопка настроек -->
        <button class="settings-btn" @click="openSettings" title="Настройки озвучки">⚙️ Настройки</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { usePlayerStore } from '../stores/playerStore';

const emit = defineEmits(['openSettings', 'toggleSubtitles']);
const playerStore = usePlayerStore();

// Состояние видимости субтитров (получаем извне через props)
const props = defineProps({
  subtitlesVisible: {
    type: Boolean,
    default: true,
  },
});

function openSettings() {
  emit('openSettings');
}

function toggleSubtitles() {
  emit('toggleSubtitles');
}
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(to right, #fff, #e0e7ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-btn,
.settings-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.toggle-btn:hover,
.settings-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.toggle-btn:active,
.settings-btn:active {
  transform: translateY(0);
}
</style>
