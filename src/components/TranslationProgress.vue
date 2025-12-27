<template>
  <div v-if="shouldShow" class="translation-progress">
    <div class="progress-header">
      <div class="progress-icon">
        <span v-if="isTranslating">🔄</span>
        <span v-else-if="isComplete">✅</span>
        <span v-else-if="hasError">❌</span>
      </div>

      <div class="progress-text">
        <h4>{{ statusText }}</h4>
        <p>{{ detailText }}</p>
      </div>
    </div>

    <div v-if="isTranslating" class="progress-bar-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="progress-percentage">{{ progress }}%</span>
    </div>

    <button v-if="hasError" @click="$emit('retry')" class="retry-button">Повторить попытку</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  isTranslating: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: 0,
  },
  error: {
    type: String,
    default: null,
  },
  totalSubtitles: {
    type: Number,
    default: 0,
  },
});

defineEmits(['retry']);

const hasError = computed(() => props.error !== null);

const isComplete = computed(() => {
  return !props.isTranslating && props.progress === 100 && !hasError.value;
});

const shouldShow = computed(() => {
  return props.isTranslating || isComplete.value || hasError.value;
});

const statusText = computed(() => {
  if (hasError.value) return 'Ошибка перевода';
  if (isComplete.value) return 'Перевод завершён!';
  if (props.isTranslating) return 'Перевод субтитров...';
  return '';
});

const detailText = computed(() => {
  if (hasError.value) return props.error;
  if (isComplete.value) {
    return `Переведено ${props.totalSubtitles} субтитров`;
  }
  if (props.isTranslating) {
    const translated = Math.round((props.progress / 100) * props.totalSubtitles);
    return `${translated} из ${props.totalSubtitles} субтитров`;
  }
  return '';
});
</script>

<style scoped>
.translation-progress {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.progress-icon {
  font-size: 2rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.progress-text h4 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.progress-text p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: white;
  border-radius: 4px;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.progress-percentage {
  font-weight: 600;
  font-size: 1.1rem;
  min-width: 50px;
  text-align: right;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s;
}

.retry-button:hover {
  transform: translateY(-2px);
}
</style>
