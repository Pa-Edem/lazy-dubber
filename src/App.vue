<!-- src/App.vue -->
<template>
  <div id="app" class="app-container">
    <!-- Заголовок приложения -->
    <header class="app-header">
      <h1>🎬 Lazy Dubber</h1>
      <p class="subtitle">Учебные видео с русской озвучкой</p>
    </header>

    <!-- Основной контент -->
    <main class="app-main">
      <!-- Пока просто заглушка -->
      <div class="placeholder">
        <p>🚀 Приложение готово к разработке!</p>
        <p class="info">Этап 1 завершён. Следующий шаг: загрузка файлов.</p>
      </div>
    </main>

    <!-- Футер -->
    <footer class="app-footer">
      <p>Личный проект для перевода видео</p>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useSettingsStore } from './stores/settingsStore';
import { useSubtitlesStore } from './stores/subtitlesStore';
import { usePlayerStore } from './stores/playerStore';

// Подключаем stores
const settingsStore = useSettingsStore();
const subtitlesStore = useSubtitlesStore();
const playerStore = usePlayerStore();

// Хук жизненного цикла: выполняется после монтирования компонента
onMounted(() => {
  console.log('✅ App.vue смонтирован');
  console.log('Настройки:', settingsStore);
  console.log('Субтитры:', subtitlesStore);
  console.log('Плеер:', playerStore);
});
</script>

<style scoped>
/* Базовые стили для приложения */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Segoe UI', Tahoma, sans-serif;
}

.app-header {
  text-align: center;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.app-header h1 {
  margin: 0;
  font-size: 3rem;
  font-weight: bold;
}

.subtitle {
  margin: 0.5rem 0 0;
  font-size: 1.2rem;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.placeholder {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  max-width: 800px;
}

.placeholder p {
  margin: 1rem 0;
  font-size: 1.5rem;
}

.info {
  font-size: 1.1rem;
  opacity: 0.8;
}

.app-footer {
  text-align: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  font-size: 0.9rem;
  opacity: 0.7;
}
</style>
