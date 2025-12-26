<!-- src/components/FileUploadZone.vue -->
<template>
  <div class="upload-zone-wrapper">
    <!-- Заголовок зоны -->
    <h3 class="upload-zone__title">{{ title }}</h3>

    <!-- Основная зона загрузки -->
    <div
      class="upload-zone"
      :class="{
        'upload-zone--dragging': isDragging,
        'upload-zone--has-file': hasFile,
        'upload-zone--error': hasError,
      }"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
    >
      <!-- Состояние 1: Пустая зона (нет файла) -->
      <div v-if="!hasFile" class="upload-zone__empty">
        <input
          ref="fileInput"
          type="file"
          :accept="acceptedFormats"
          @change="handleFileSelect"
          class="upload-zone__input"
        />

        <div class="upload-zone__icon">📁</div>

        <p class="upload-zone__text">
          Перетащите файл сюда<br />
          или <span class="upload-zone__link" @click="triggerFileInput">выберите файл</span>
        </p>

        <p class="upload-zone__hint">
          {{ acceptedFormats }}
        </p>
      </div>

      <!-- Состояние 2: Файл загружен -->
      <div v-else class="upload-zone__file">
        <div class="file-info">
          <div class="file-info__icon">
            {{ fileType === 'video' ? '🎬' : '📄' }}
          </div>

          <div class="file-info__details">
            <div class="file-info__name">{{ fileName }}</div>
            <div class="file-info__size">{{ formattedSize }}</div>
          </div>

          <button @click="handleRemove" class="file-info__remove" title="Удалить файл">×</button>
        </div>
      </div>

      <!-- Ошибка (показывается поверх любого состояния) -->
      <div v-if="hasError" class="upload-zone__error">⚠️ {{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useFilesStore } from '../stores/filesStore';
import { useFileUpload } from '../composables/useFileUpload';

// Props
const props = defineProps({
  fileType: {
    type: String,
    required: true,
    validator: (value) => ['video', 'vtt'].includes(value),
  },
  title: {
    type: String,
    required: true,
  },
});

// Composables и stores
const filesStore = useFilesStore();
const { handleFile, acceptedFormats } = useFileUpload(props.fileType);

// Refs
const fileInput = ref(null);
const isDragging = ref(false);

// Computed properties - читаем данные из store
const fileData = computed(() => {
  return props.fileType === 'video' ? filesStore.video : filesStore.vtt;
});

const hasFile = computed(() => {
  return fileData.value.file !== null;
});

const hasError = computed(() => {
  return fileData.value.error !== null;
});

const errorMessage = computed(() => {
  return fileData.value.error;
});

const fileName = computed(() => {
  return fileData.value.name;
});

const fileSize = computed(() => {
  return fileData.value.size;
});

// Форматируем размер файла в человекочитаемый вид
const formattedSize = computed(() => {
  const bytes = fileSize.value;

  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Округляем до 2 знаков после запятой
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
});

// Методы для drag-and-drop

/**
 * Обрабатывает событие dragenter
 * Срабатывает, когда файл впервые появляется над зоной
 */
const handleDragEnter = () => {
  isDragging.value = true;
};

/**
 * Обрабатывает событие dragleave
 * Срабатывает, когда файл покидает зону
 */
const handleDragLeave = (e) => {
  // Проверяем, что мы действительно покинули зону
  // (а не просто переместились на дочерний элемент)
  if (e.target.classList.contains('upload-zone')) {
    isDragging.value = false;
  }
};

/**
 * Обрабатывает событие dragover
 * Срабатывает постоянно, пока файл над зоной
 */
const handleDragOver = () => {
  // Нужен для того, чтобы сработал drop
  // По умолчанию браузер не позволяет drop
};

/**
 * Обрабатывает событие drop
 * Срабатывает, когда пользователь отпускает файл
 */
const handleDrop = async (e) => {
  isDragging.value = false;

  // DataTransfer содержит информацию о перетаскиваемых данных
  const files = e.dataTransfer.files;

  // Берём только первый файл (даже если пользователь перетащил несколько)
  if (files.length > 0) {
    await handleFile(files[0]);
  }
};

/**
 * Обрабатывает выбор файла через input
 */
const handleFileSelect = async (e) => {
  const files = e.target.files;

  if (files.length > 0) {
    await handleFile(files[0]);
  }

  // Очищаем input, чтобы можно было загрузить тот же файл повторно
  // (если пользователь удалит файл и захочет загрузить его снова)
  e.target.value = '';
};

/**
 * Программно открывает диалог выбора файла
 */
const triggerFileInput = () => {
  fileInput.value?.click();
};

/**
 * Удаляет загруженный файл
 */
const handleRemove = () => {
  if (props.fileType === 'video') {
    filesStore.clearVideoFile();
  } else {
    filesStore.clearVttFile();
  }
};
</script>

<style scoped>
.upload-zone-wrapper {
  margin-bottom: 2rem;
}

.upload-zone__title {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

/* Основная зона загрузки */
.upload-zone {
  border: 2px dashed #cbd5e0;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background-color: #f7fafc;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Состояние: файл перетаскивается над зоной */
.upload-zone--dragging {
  border-color: #4299e1;
  background-color: #ebf8ff;
  transform: scale(1.02);
}

/* Состояние: файл загружен */
.upload-zone--has-file {
  border-color: #48bb78;
  background-color: #f0fff4;
}

/* Состояние: ошибка */
.upload-zone--error {
  border-color: #f56565;
  background-color: #fff5f5;
}

/* Скрытый input */
.upload-zone__input {
  display: none;
}

/* Пустое состояние */
.upload-zone__empty {
  width: 100%;
}

.upload-zone__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.upload-zone__text {
  font-size: 1rem;
  color: #4a5568;
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.upload-zone__link {
  color: #4299e1;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s;
}

.upload-zone__link:hover {
  color: #2b6cb0;
}

.upload-zone__hint {
  font-size: 0.875rem;
  color: #718096;
}

/* Информация о файле */
.upload-zone__file {
  width: 100%;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.file-info__icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.file-info__details {
  flex-grow: 1;
  text-align: left;
}

.file-info__name {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.file-info__size {
  font-size: 0.875rem;
  color: #718096;
}

.file-info__remove {
  background: none;
  border: none;
  font-size: 2rem;
  color: #cbd5e0;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info__remove:hover {
  background-color: #fed7d7;
  color: #f56565;
  transform: rotate(90deg);
}

/* Сообщение об ошибке */
.upload-zone__error {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  right: 0.5rem;
  background-color: #fed7d7;
  color: #c53030;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}
</style>
