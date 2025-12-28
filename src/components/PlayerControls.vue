<!-- src/components/PlayerControls.vue -->
<template>
  <div class="player-controls">
    <!-- Прогресс-бар (таймлайн) -->
    <div class="timeline-container">
      <input
        type="range"
        class="timeline"
        :value="playerStore.currentTime"
        :max="playerStore.duration"
        step="0.1"
        @input="onSeek"
        @mousedown="onSeekStart"
        @mouseup="onSeekEnd"
      />
      <div class="timeline-progress" :style="{ width: playerStore.playbackProgress + '%' }"></div>
    </div>

    <!-- Кнопки управления -->
    <div class="controls-row">
      <!-- Левая группа: Play/Pause + перемотка -->
      <div class="controls-left">
        <!-- Перемотка назад -->
        <button class="control-btn" @click="videoPlayer.seekBackward(10)" title="Назад на 10 секунд">
          <span class="icon">⏮</span>
        </button>

        <!-- Play / Pause -->
        <button
          class="control-btn control-btn-large"
          @click="videoPlayer.togglePlayPause"
          :title="playerStore.isPlaying ? 'Пауза' : 'Воспроизведение'"
        >
          <span class="icon" v-if="!playerStore.isPlaying">▶</span>
          <span class="icon" v-else>⏸</span>
        </button>

        <!-- Перемотка вперёд -->
        <button class="control-btn" @click="videoPlayer.seekForward(10)" title="Вперёд на 10 секунд">
          <span class="icon">⏭</span>
        </button>

        <!-- Время -->
        <div class="time-display">{{ playerStore.formattedCurrentTime }} / {{ playerStore.formattedDuration }}</div>
      </div>

      <!-- Правая группа: громкость + настройки -->
      <div class="controls-right">
        <!-- Включение/выключение озвучки -->
        <button
          class="control-btn"
          @click="toggleDubbing"
          :title="settingsStore.isDubbingEnabled ? 'Выключить озвучку' : 'Включить озвучку'"
          :class="{ active: settingsStore.isDubbingEnabled }"
        >
          <span class="icon" v-if="settingsStore.isDubbingEnabled">🎙️</span>
          <span class="icon" v-else>🔇</span>
        </button>

        <!-- Громкость -->
        <div class="volume-control">
          <button class="control-btn" @click="toggleMute" title="Без звука / Со звуком">
            <span class="icon" v-if="playerStore.volume === 0">🔇</span>
            <span class="icon" v-else-if="playerStore.volume < 0.5">🔉</span>
            <span class="icon" v-else>🔊</span>
          </button>

          <!-- Слайдер громкости -->
          <input
            type="range"
            class="volume-slider"
            :value="playerStore.volume"
            min="0"
            max="1"
            step="0.1"
            @input="onVolumeChange"
          />
        </div>
      </div>

      <!-- Панель размера фрейма -->
      <div class="frame-size-controls">
        <span class="size-label">Размер:</span>
        <button
          v-for="option in frameSizeOptions"
          :key="option.value || 'fullscreen'"
          class="size-btn"
          :class="{ active: settingsStore.videoFrameWidth === option.value && !isFullscreen }"
          @click="setFrameSize(option.value)"
          :title="`Размер фрейма ${option.label}`"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Проверяем находимся ли в полноэкранном режиме
 */
const isFullscreen = ref(false);

// ==========================================
// STORES
// ==========================================

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();

/**
 * Получаем videoPlayer от родителя через inject
 */
const videoPlayer = inject('videoPlayer');

// ==========================================
// УПРАВЛЕНИЕ SEEK (ПЕРЕМОТКА)
// ==========================================

/**
 * Флаг: пользователь сейчас перематывает видео
 */
const isSeeking = ref(false);

/**
 * Обработчик перемотки через таймлайн
 */
const onSeek = (event) => {
  const newTime = parseFloat(event.target.value);
  videoPlayer.seekTo(newTime);
};

/**
 * Начало перемотки (mousedown на таймлайне)
 */
const onSeekStart = () => {
  isSeeking.value = true;
};

/**
 * Конец перемотки (mouseup на таймлайне)
 */
const onSeekEnd = () => {
  isSeeking.value = false;
};

// ==========================================
// УПРАВЛЕНИЕ ГРОМКОСТЬЮ
// ==========================================

/**
 * Последнее значение громкости перед mute
 */
const volumeBeforeMute = ref(1.0);

/**
 * Изменение громкости через слайдер
 */
const onVolumeChange = (event) => {
  const newVolume = parseFloat(event.target.value);
  videoPlayer.setVolume(newVolume);
};

/**
 * Включить/выключить звук
 */
const toggleMute = () => {
  if (playerStore.volume === 0) {
    // Восстанавливаем звук
    videoPlayer.setVolume(volumeBeforeMute.value);
  } else {
    // Запоминаем текущую громкость и выключаем звук
    volumeBeforeMute.value = playerStore.volume;
    videoPlayer.setVolume(0);
  }
};

// ==========================================
// УПРАВЛЕНИЕ ОЗВУЧКОЙ
// ==========================================

/**
 * Включить/выключить озвучку (dubbing)
 */
const toggleDubbing = () => {
  settingsStore.isDubbingEnabled = !settingsStore.isDubbingEnabled;
  settingsStore.saveSettings();

  console.log('🎙️ Озвучка:', settingsStore.isDubbingEnabled ? 'ВКЛ' : 'ВЫКЛ');
};

// ==========================================
// УПРАВЛЕНИЕ РАЗМЕРОМ ФРЕЙМА
// ==========================================

/**
 * Доступные размеры фрейма
 * null = полноэкранный режим
 */
const frameSizeOptions = [
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' },
  { value: null, label: 'Fullscreen' },
];

/**
 * Установить размер фрейма
 */
const setFrameSize = (size) => {
  if (size === null) {
    // Полноэкранный режим
    toggleFullscreen();
  } else {
    // Обычный режим с заданной шириной
    settingsStore.videoFrameWidth = size;
    settingsStore.saveSettings();
    console.log('📐 Размер фрейма:', size + '%');
  }
};

/**
 * Переключение полноэкранного режима
 */
const toggleFullscreen = () => {
  const videoContainer = document.querySelector('.video-container');

  if (!document.fullscreenElement) {
    // Войти в полноэкранный режим
    videoContainer.requestFullscreen().catch((err) => {
      console.error('Ошибка полноэкранного режима:', err);
    });
  } else {
    // Выйти из полноэкранного режима
    document.exitFullscreen();
  }
};

// Отслеживаем изменения полноэкранного режима
onMounted(() => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});
</script>

<style scoped>
/* ==========================================
   ОСНОВНОЙ КОНТЕЙНЕР
   ========================================== */

.player-controls {
  width: 100%;
}

/* ==========================================
   ТАЙМЛАЙН (ПРОГРЕСС-БАР)
   ========================================== */

.timeline-container {
  position: relative;
  width: 100%;
  height: 6px;
  margin-bottom: 16px;
  cursor: pointer;
}

.timeline {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  position: relative;
  z-index: 2;
}

/* Ползунок таймлайна */
.timeline::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.timeline::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Полоса прогресса */
.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 6px;
  background: #2196f3;
  border-radius: 3px;
  pointer-events: none;
  z-index: 1;
}

/* ==========================================
   КНОПКИ УПРАВЛЕНИЯ
   ========================================== */

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-btn:active {
  background: rgba(255, 255, 255, 0.2);
}

/* Большая кнопка Play/Pause */
.control-btn-large {
  padding: 12px 16px;
}

.control-btn-large .icon {
  font-size: 24px;
}

/* Активная кнопка (озвучка включена) */
.control-btn.active {
  background: rgba(33, 150, 243, 0.3);
}

/* Иконки */
.icon {
  font-size: 18px;
  line-height: 1;
  user-select: none;
}

/* ==========================================
   ОТОБРАЖЕНИЕ ВРЕМЕНИ
   ========================================== */

.time-display {
  color: #fff;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-left: 8px;
}

/* ==========================================
   УПРАВЛЕНИЕ ГРОМКОСТЬЮ
   ========================================== */

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* ==========================================
   РАЗМЕР ФРЕЙМА
   ========================================== */

.frame-size-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 16px;
}

.size-label {
  color: #fff;
  font-size: 13px;
  margin-right: 4px;
  opacity: 0.8;
}

.size-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.size-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.size-btn.active {
  background: #2196f3;
  border-color: #2196f3;
  font-weight: 600;
}
</style>
