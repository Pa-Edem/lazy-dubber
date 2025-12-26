<!-- src/views/UploadView.vue -->
<template>
  <div class="upload-view">
    <!-- Заголовок страницы -->
    <header class="upload-view__header">
      <h1 class="upload-view__title">Lazy Dubber</h1>
      <p class="upload-view__subtitle">Загрузите видео и субтитры для начала работы</p>
    </header>

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

    <!-- Сайдбар субтитров -->
    <SubtitlesSidebar />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFilesStore } from '../stores/filesStore';
import FileUploadZone from '../components/FileUploadZone.vue';
import SubtitlesSidebar from '../components/SubtitlesSidebar.vue';

const router = useRouter();
const filesStore = useFilesStore();

// Computed properties

/**
 * Проверяем, можно ли перейти к следующему этапу
 * Требуется: оба файла загружены и нет ошибок
 */
const canProceed = computed(() => {
  return filesStore.isReadyToProcess;
});

/**
 * Показывать ли предупреждение о несовпадении имён
 * Показываем только если:
 * 1. Оба файла загружены
 * 2. Имена не совпадают
 */
const showNamesMismatchWarning = computed(() => {
  return filesStore.video.file && filesStore.vtt.file && !filesStore.namesMatch;
});

/**
 * Показывать ли информацию о загруженных файлах
 * Показываем, если оба файла загружены и имена совпадают
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

  return 'Продолжить →';
});

// Методы

/**
 * Обработчик клика по кнопке "Продолжить"
 * Переход к следующему этапу (будет реализован позже)
 */
const handleProceed = () => {
  if (!canProceed.value) {
    return;
  }

  // TODO: На следующих этапах здесь будет переход к парсингу и плееру
  // Пока просто выводим в консоль для проверки
  console.log('Переход к следующему этапу');
  console.log('Видео:', filesStore.video);
  console.log('VTT:', filesStore.vtt);

  // В будущем здесь будет:
  // router.push('/player');
};
</script>

<style scoped>
.upload-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

/* Заголовок */
.upload-view__header {
  text-align: center;
  margin-bottom: 3rem;
}

.upload-view__title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

.upload-view__subtitle {
  font-size: 1.1rem;
  color: #2b313b;
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
  color: white;
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
  color: #718096;
  font-size: 0.9rem;
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
  .upload-view {
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
