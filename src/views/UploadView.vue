<!-- src/views/UploadView.vue -->
<template>
  <div class="upload-view">
    <!-- Основной контент -->
    <div class="main-content" :class="{ 'with-sidebar': subtitlesVisible }">
      <!-- ЭКРАН 1: Загрузка файлов (показываем ЕСЛИ плеер не готов) -->
      <div v-if="!playerStore.isReady" class="upload-screen">
        <!-- Описание -->
        <div class="upload-view__description">
          <p class="upload-view__subtitle">Загрузите видео и субтитры для начала работы</p>
        </div>
        <!-- Зоны загрузки -->
        <div class="upload-view__zones">
          <FileUploadZone file-type="video" title="Видео файл" />
          <FileUploadZone file-type="vtt" title="Файл субтитров (.vtt)" />
        </div>

        <!-- Предупреждение о несовпадении имён -->
        <transition name="warning">
          <div v-if="showNamesMismatchWarning" class="upload-view__warning">
            <div class="warning-card">
              <div class="warning-card__icon">⚠️</div>
              <div class="warning-card__content">
                <h3 class="warning-card__title">Имена файлов не совпадают</h3>
                <p class="warning-card__text">
                  Видео: <strong>{{ videoFileName }}</strong
                  ><br />
                  Субтитры: <strong>{{ vttFileName }}</strong>
                </p>
                <p class="warning-card__hint">
                  Рекомендуется использовать одинаковые имена для корректной синхронизации. Вы можете продолжить, но
                  возможны проблемы.
                </p>
              </div>
            </div>
          </div>
        </transition>

        <!-- Информация о загруженных файлах -->
        <transition name="fade">
          <div v-if="showFilesInfo" class="upload-view__info">
            <div class="info-card">
              <h3 class="info-card__title">✓ Файлы загружены</h3>
              <div class="info-card__details">
                <div class="info-item">
                  <span class="info-item__label">Видео:</span>
                  <span class="info-item__value">{{ videoFileName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-item__label">Субтитры:</span>
                  <span class="info-item__value">{{ vttFileName }}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- Прогресс перевода -->
        <TranslationProgress
          v-if="subtitlesStore.hasSubtitles"
          :is-translating="isTranslating"
          :progress="translationProgress"
          :error="translationError"
          :total-subtitles="totalSubtitles"
          :is-already-translated="isFileAlreadyTranslated"
          @retry="retryTranslation"
        />

        <!-- Кнопка для перехода к следующему этапу -->
        <div class="upload-view__actions">
          <button
            class="btn-primary"
            :class="{ 'btn-primary--disabled': !canProceed }"
            :disabled="!canProceed"
            @click="handleProceed"
          >
            {{ buttonText }}
          </button>

          <p v-if="!canProceed" class="upload-view__hint">Загрузите оба файла для продолжения</p>
        </div>
      </div>
      <!-- ЭКРАН 2: Плеер (показываем ЕСЛИ плеер готов) -->
      <div v-else class="player-screen">
        <!-- Кнопка "Назад" -->
        <button class="back-button" @click="handleBack">← Загрузить другие файлы</button>

        <!-- Основная область с плеером и субтитрами -->
        <div class="player-layout">
          <!-- Видеоплеер -->
          <div class="player-section">
            <VideoPlayer />
          </div>
        </div>
      </div>
    </div>
    <!-- Сайдбар с субтитрами -->
    <div v-if="subtitlesVisible" class="sidebar-section">
      <SubtitlesSidebar />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, inject } from 'vue';
import { useFilesStore } from '../stores/filesStore';
import { usePlayerStore } from '../stores/playerStore';
import { useSubtitlesStore } from '../stores/subtitlesStore';
import { useVttParser } from '../composables/useVttParser';
import translationService from '../services/translationService';
import FileUploadZone from '../components/FileUploadZone.vue';
import SubtitlesSidebar from '../components/SubtitlesSidebar.vue';
import VideoPlayer from '../components/VideoPlayer.vue';
import TranslationProgress from '../components/TranslationProgress.vue';

const filesStore = useFilesStore();
const playerStore = usePlayerStore();
const subtitlesStore = useSubtitlesStore();
const { parseVttText } = useVttParser();

const subtitlesVisible = inject('subtitlesVisible');
// ========== Состояние перевода ==========
const translationProgress = ref(0);
const translationError = ref(null);
const isParsingVtt = ref(false);

// ==========================================
// COMPUTED PROPERTIES
// ==========================================

const isFileAlreadyTranslated = computed(() => {
  const vttFileName = filesStore.vtt.file?.name || '';
  return vttFileName.toLowerCase().endsWith('_ru.vtt') || vttFileName.toLowerCase().endsWith('.ru.vtt');
});

/**
 * Проверяем, можно ли перейти к следующему этапу
 * Требуется: оба файла загружены и нет ошибок
 */
const canProceed = computed(() => {
  return filesStore.isReadyToProcess;
});

/**
 * Показывать ли предупреждение о несовпадении имён
 * НЕ показываем если:
 * - Файлы совпадают
 * - VTT файл переведённый (_ru или .ru)
 */
const showNamesMismatchWarning = computed(() => {
  // Если один из файлов не загружен - не показываем
  if (!filesStore.video.file || !filesStore.vtt.file) {
    return false;
  }

  // Проверяем: это переведённый VTT?
  const vttFileName = filesStore.vtt.file.name || '';
  const isTranslatedVtt =
    vttFileName.toLowerCase().endsWith('_ru.vtt') || vttFileName.toLowerCase().endsWith('.ru.vtt');

  // Если это переведённый файл - не показываем предупреждение
  if (isTranslatedVtt) {
    return false;
  }

  // Иначе показываем если имена не совпадают
  return !filesStore.namesMatch;
});

/**
 * Показывать ли информацию о загруженных файлах
 */
const showFilesInfo = computed(() => {
  return filesStore.video.file && filesStore.vtt.file && filesStore.namesMatch;
});

/**
 * Имя видео файла
 */
const videoFileName = computed(() => {
  return filesStore.video.name || '';
});

/**
 * Имя VTT файла
 */
const vttFileName = computed(() => {
  return filesStore.vtt.name || '';
});

/**
 * Текст кнопки в зависимости от состояния
 */
const buttonText = computed(() => {
  if (!filesStore.video.file && !filesStore.vtt.file) {
    return 'Загрузите файлы';
  }

  if (!filesStore.video.file) {
    return 'Загрузите видео';
  }

  if (!filesStore.vtt.file) {
    return 'Загрузите субтитры';
  }

  if (isParsingVtt.value) {
    return 'Парсинг субтитров...';
  }

  if (subtitlesStore.isTranslating) {
    return `Перевод... ${translationProgress.value}%`;
  }

  return 'Продолжить →';
});

// ========== Computed для прогресса ==========
const isTranslating = computed(() => subtitlesStore.isTranslating);
const totalSubtitles = computed(() => subtitlesStore.totalCount);

// ==========================================
// METHODS
// ==========================================

/**
 * Обработчик клика по кнопке "Продолжить"
 * Копирует файлы из filesStore в playerStore и переключает экран
 */
const handleProceed = async () => {
  if (!canProceed.value) {
    return;
  }

  console.log('✅ Переход к плееру');
  console.log('📹 Видео:', filesStore.video);
  console.log('📝 VTT:', filesStore.vtt);

  // ========== Парсинг VTT и запуск перевода ==========
  try {
    isParsingVtt.value = true;

    // Читаем VTT файл как текст
    const vttText = await readFileAsText(filesStore.vtt.file);

    // Парсим VTT (передаём имя файла для определения типа)
    const parseResult = await parseVttText(vttText, filesStore.vtt.file.name);

    if (!parseResult.success) {
      alert(`Ошибка парсинга VTT: ${parseResult.error}`);
      isParsingVtt.value = false;
      return;
    }

    console.log('✅ VTT parsed:', parseResult.data.length, 'subtitles');
    isParsingVtt.value = false;

    // ========== ПРОВЕРЯЕМ: ЭТО ПЕРЕВЕДЁННЫЙ ФАЙЛ? ==========
    if (parseResult.isTranslated) {
      console.log('🎉 Это уже переведённый файл, перевод не требуется!');

      // Устанавливаем прогресс = 100%
      translationProgress.value = 100;
      subtitlesStore.setTranslatingStatus(false);

      // Копируем файлы в playerStore и переходим к плееру
      playerStore.setVideoFile(filesStore.video.file);
      playerStore.setVttFile(filesStore.vtt.file);

      return; // Завершаем без запуска перевода
    }
    // ========================================================

    // Запускаем перевод (только для оригинальных файлов)
    await startTranslation();

    // Копируем файлы в playerStore
    playerStore.setVideoFile(filesStore.video.file);
    playerStore.setVttFile(filesStore.vtt.file);
  } catch (error) {
    console.error('❌ Error processing files:', error);
    alert(`Ошибка обработки файлов: ${error.message}`);
    isParsingVtt.value = false;
  }
};

/**
 * Обработчик кнопки "Назад"
 * Возвращает на экран загрузки
 */
const handleBack = () => {
  // Сбрасываем состояние плеера
  playerStore.reset();
  subtitlesStore.reset();
  translationProgress.value = 0;
  translationError.value = null;
  console.log('⬅️ Возврат к загрузке файлов');
};

/**
 * Читает файл как текст
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Не удалось прочитать файл'));
    };

    reader.readAsText(file);
  });
}

/**
 * Запускает перевод субтитров
 */
async function startTranslation() {
  const subtitles = subtitlesStore.items;
  const vttContent = subtitlesStore.vttContent;

  if (subtitles.length === 0) {
    console.warn('[UploadView] No subtitles to translate');
    return;
  }

  console.log('[UploadView] Starting translation for', subtitles.length, 'subtitles');

  subtitlesStore.setTranslatingStatus(true);
  translationProgress.value = 0;
  translationError.value = null;

  try {
    await translationService.translateSubtitles(subtitles, {
      vttContent,
      onProgress: (progress) => {
        translationProgress.value = progress;
        subtitlesStore.setTranslationProgress(progress);
        console.log('[UploadView] Translation progress:', progress + '%');
      },
      onComplete: () => {
        console.log('[UploadView] Translation complete!');
        subtitlesStore.setTranslatingStatus(false);
      },
      onError: (error) => {
        console.error('[UploadView] Translation error:', error);
        translationError.value = error.message;
        subtitlesStore.setTranslationError(error);
        subtitlesStore.setTranslatingStatus(false);
      },
    });
  } catch (error) {
    console.error('[UploadView] Translation failed:', error);
    translationError.value = error.message;
    subtitlesStore.setTranslationError(error);
    subtitlesStore.setTranslatingStatus(false);
  }
}

/**
 * Повторная попытка перевода
 */
function retryTranslation() {
  translationError.value = null;
  subtitlesStore.setTranslationError(null);
  startTranslation();
}
</script>

<style scoped>
.upload-view {
  min-height: calc(100vh - 60px); /* 60px = высота header */
  display: flex;
  gap: 20px;
  padding: 20px;
  background: #f7fafc;
}

.main-content {
  flex: 1;
  transition: all 0.3s ease;
}
/* Когда сайдбар видим - ограничиваем ширину */
.main-content.with-sidebar {
  max-width: calc(100% - 420px); /* 400px сайдбар + 20px gap */
}

/* Сайдбар (зелёная область) */
.sidebar-section {
  width: 400px;
  min-width: 400px;
  height: calc(100vh - 100px); /* 60px header + 40px padding */
  position: sticky;
  top: 80px; /* 60px header + 20px padding */
  transition: all 0.3s ease;
}
/* ==========================================
   ЭКРАН ЗАГРУЗКИ
   ========================================== */

.upload-screen {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.upload-view__description {
  text-align: center;
  margin-bottom: 2rem;
}

.upload-view__subtitle {
  font-size: 1.1rem;
  color: hsl(220, 100%, 96%);
}

/* Зоны загрузки */
.upload-view__zones {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Предупреждение */
.upload-view__warning {
  margin-bottom: 2rem;
}

.warning-card {
  background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
  border: 2px solid #f39c12;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(243, 156, 18, 0);
  }
}

.warning-card__icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.warning-card__content {
  flex-grow: 1;
}

.warning-card__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #d68910;
  margin-bottom: 0.5rem;
}

.warning-card__text {
  color: #7d6608;
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.warning-card__text strong {
  color: #d68910;
  font-weight: 600;
}

.warning-card__hint {
  font-size: 0.875rem;
  color: #9c7c0a;
  font-style: italic;
}

/* Информация о файлах */
.upload-view__info {
  margin-bottom: 2rem;
}

.info-card {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border: 2px solid #66bb6a;
  border-radius: 12px;
  padding: 1.5rem;
}

.info-card__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 1rem;
}

.info-card__details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-item__label {
  font-weight: 600;
  color: #1b5e20;
  min-width: 100px;
}

.info-item__value {
  color: #2e7d32;
}

/* Действия (кнопки) */
.upload-view__actions {
  text-align: center;
  margin-top: 3rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: hsl(250, 50%, 40%);
  border: none;
  padding: 1rem 3rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover:not(.btn-primary--disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.btn-primary:active:not(.btn-primary--disabled) {
  transform: translateY(0);
}

.btn-primary--disabled {
  background: #cbd5e0;
  cursor: not-allowed;
  box-shadow: none;
}

.upload-view__hint {
  margin-top: 1rem;
  color: hsl(220, 50%, 20%);
  font-size: 0.9rem;
}

/* ==========================================
   ЭКРАН ПЛЕЕРА
   ========================================== */

.player-screen {
  width: 100%;
  min-height: 100vh;
}

.back-button {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #4a5568;
  transition: all 0.2s ease;
  margin-bottom: 20px;
}

.back-button:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
  transform: translateX(-2px);
}

.player-layout {
  max-width: 1600px;
  margin: 0 auto;
}

.player-section {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* Анимации переходов */
.warning-enter-active,
.warning-leave-active {
  transition: all 0.3s ease;
}

.warning-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.warning-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Адаптивность */
@media (max-width: 768px) {
  .upload-screen {
    padding: 1rem;
  }

  .upload-view__title {
    font-size: 2rem;
  }

  .warning-card {
    flex-direction: column;
    text-align: center;
  }

  .info-item {
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-item__label {
    min-width: auto;
  }
}
</style>
