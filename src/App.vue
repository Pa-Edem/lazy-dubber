<!-- src/App.vue -->
<template>
  <div class="app-container">
    <main class="main">
      <RouterView />
    </main>
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
  width: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Segoe UI', Tahoma, sans-serif;
}
.main {
  flex: 1;
  width: 100%;
  margin: 0 auto;
}
</style>
