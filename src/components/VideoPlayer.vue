<!-- src/components/VideoPlayer.vue -->
<template>
  <div class="video-player" v-if="playerStore.isReady">
    <!-- Контейнер для видео -->
    <div class="video-container" :style="{ width: settingsStore.videoFrameWidth + '%' }">
      <video
        ref="videoElement"
        :src="playerStore.videoUrl"
        class="video-element"
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
      >
        Ваш браузер не поддерживает видео.
      </video>

      <!-- Оверлей с контролами (появляется при наведении) -->
      <div class="controls-overlay">
        <PlayerControls />
      </div>
    </div>

    <!-- Информационная панель -->
    <div class="video-info" :style="{ width: settingsStore.videoFrameWidth + '%' }">
      <div class="video-title">
        {{ playerStore.videoFile?.name || 'Видео загружено' }}
      </div>
      <div class="video-stats">
        <span>{{ playerStore.formattedCurrentTime }}</span>
        <span class="separator">/</span>
        <span>{{ playerStore.formattedDuration }}</span>
      </div>
    </div>
  </div>

  <!-- Заглушка если видео не загружено -->
  <div v-else class="video-placeholder">
    <p>Загрузите видео и VTT-файл для начала работы</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';
import { usePlayerStore } from '../stores/playerStore';
import { useVideoPlayer } from '../composables/useVideoPlayer';
import PlayerControls from './PlayerControls.vue';

// ==========================================
// STORES И COMPOSABLES
// ==========================================
const settingsStore = useSettingsStore();
const playerStore = usePlayerStore();

/**
 * Ref на DOM элемент <video>
 * Передаём его в useVideoPlayer для управления
 */
const videoElement = ref(null);

/**
 * Создаём videoPlayer composable
 */
const videoPlayer = useVideoPlayer(videoElement);

/**
 * Предоставляем videoPlayer дочерним компонентам
 * Теперь PlayerControls сможет использовать эти методы
 */
provide('videoPlayer', videoPlayer);

/**
 * Получаем все методы управления плеером
 */
const { handleTimeUpdate, handleLoadedMetadata, handlePlay, handlePause } = videoPlayer;

/**
 * Следим за программной перемоткой
 * Когда playerStore.currentTime меняется НЕ от timeupdate события,
 * синхронизируем с video элементом
 */
let isSeekingProgrammatically = false;

watch(
  () => playerStore.currentTime,
  (newTime) => {
    if (!videoElement.value) return;

    // Проверяем: отличается ли время в store от времени в video элементе?
    const timeDiff = Math.abs(videoElement.value.currentTime - newTime);

    // Если разница больше 0.5 секунды - это программная перемотка
    if (timeDiff > 0.5) {
      isSeekingProgrammatically = true;
      videoElement.value.currentTime = newTime;
      console.log(`⏩ Перемотка на ${newTime.toFixed(2)}s`);

      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => {
        isSeekingProgrammatically = false;
      }, 100);
    }
  }
);

// ==========================================
// ОБРАБОТЧИКИ СОБЫТИЙ ВИДЕО
// ==========================================

/**
 * Когда загружены метаданные видео
 * Получаем длительность и другую информацию
 */
const onLoadedMetadata = () => {
  handleLoadedMetadata();
  console.log('✅ Видео загружено, длительность:', playerStore.duration);
};

/**
 * Обновление текущего времени
 * Срабатывает ~4-10 раз в секунду
 */
const onTimeUpdate = () => {
  handleTimeUpdate();
};

/**
 * Когда видео начало играть
 */
const onPlay = () => {
  handlePlay();
};

/**
 * Когда видео поставили на паузу
 */
const onPause = () => {
  handlePause();
};

/**
 * Когда видео закончилось
 * Сбрасываем состояние
 */
const onEnded = () => {
  playerStore.setPlaying(false);
  console.log('✅ Видео завершено');
};

// ==========================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ==========================================

onMounted(() => {
  console.log('🎬 VideoPlayer монтирован');
});

onUnmounted(() => {
  console.log('👋 VideoPlayer размонтирован');
  // Очищаем ресурсы если нужно
});
</script>

<style scoped>
/* ==========================================
   КОНТЕЙНЕР ПЛЕЕРА
   ========================================== */

.video-player {
  width: 100%;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
}

/* ==========================================
   ВИДЕО ЭЛЕМЕНТ
   ========================================== */

.video-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  transition: width 0.3s ease;
}

/* Полноэкранный режим */
.video-container:fullscreen {
  width: 100% !important;
  max-width: 100% !important;
  border-radius: 0;
}

.video-element {
  width: 100%;
  height: auto;
  display: block;
  /* Убираем нативные контролы браузера */
  /* Можно включить для отладки: controls */
}

/* ==========================================
   ОВЕРЛЕЙ С КОНТРОЛАМИ
   ========================================== */

.controls-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 20px;
  transition: opacity 0.3s ease;
}

/* Скрываем контролы когда не наведён курсор (опционально) */
.video-container:not(:hover) .controls-overlay {
  opacity: 0;
}

.video-container:hover .controls-overlay {
  opacity: 1;
}

/* ==========================================
   ИНФОРМАЦИОННАЯ ПАНЕЛЬ
   ========================================== */
.video-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  background: #000;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  transition: width 0.3s ease;
}
.video-info {
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 0 0 8px 8px;
  transition: width 0.3s ease;
}

.video-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.video-stats {
  font-size: 14px;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.separator {
  margin: 0 4px;
}

/* ==========================================
   ЗАГЛУШКА
   ========================================== */

.video-placeholder {
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 8px;
  color: #666;
  font-size: 16px;
}
</style>
