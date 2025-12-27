<template>
  <div class="test-gemini">
    <h2>🧪 Gemini API Test</h2>

    <div class="model-info">
      <p><strong>Using model:</strong> {{ modelName }}</p>
      <p><strong>API Key:</strong> {{ apiKeyMasked }}</p>
    </div>

    <div class="test-section">
      <h3>Test 1: Single Translation</h3>
      <button @click="testSingle" :disabled="loading">
        {{ loading ? 'Testing...' : 'Run Test' }}
      </button>

      <div v-if="singleResult" class="result">
        <p><strong>Original:</strong> Hello, how are you?</p>
        <p><strong>Translation:</strong> {{ singleResult }}</p>
      </div>
    </div>

    <div class="test-section">
      <h3>Test 2: Batch Translation</h3>
      <button @click="testBatch" :disabled="loading">
        {{ loading ? 'Testing...' : 'Run Test' }}
      </button>

      <div v-if="batchResults.length" class="result">
        <p v-for="(item, index) in batchResults" :key="index">
          <strong>{{ index + 1 }}.</strong> {{ item.original }} → {{ item.translation }}
        </p>
      </div>
    </div>

    <div class="test-section">
      <h3>Test 3: Health Check</h3>
      <button @click="testHealth" :disabled="loading">
        {{ loading ? 'Testing...' : 'Run Test' }}
      </button>

      <div v-if="healthStatus !== null" class="result">
        <p :class="healthStatus ? 'success' : 'error'">API Status: {{ healthStatus ? '✅ Working' : '❌ Failed' }}</p>
      </div>
    </div>

    <div v-if="error" class="error-box">
      <h3>❌ Error:</h3>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import geminiAPI from '../services/api/geminiApi';

const loading = ref(false);
const error = ref(null);

const modelName = computed(() => {
  return import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
});

const apiKeyMasked = computed(() => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) return 'Not set';
  return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
});

// Test 1: Single translation
const singleResult = ref('');

async function testSingle() {
  loading.value = true;
  error.value = null;

  try {
    console.log('🧪 Test 1: Single translation');
    const result = await geminiAPI.translateSingle('Hello, how are you?');
    singleResult.value = result;
    console.log('✅ Result:', result);
  } catch (err) {
    error.value = err.message;
    console.error('❌ Error:', err);
  } finally {
    loading.value = false;
  }
}

// Test 2: Batch translation
const batchResults = ref([]);

async function testBatch() {
  loading.value = true;
  error.value = null;

  try {
    console.log('🧪 Test 2: Batch translation');

    const originals = ['Good morning!', 'What time is it?', 'I love this movie', 'See you later'];

    const translations = await geminiAPI.translateBatch(originals);

    batchResults.value = originals.map((original, index) => ({
      original,
      translation: translations[index],
    }));

    console.log('✅ Results:', translations);
  } catch (err) {
    error.value = err.message;
    console.error('❌ Error:', err);
  } finally {
    loading.value = false;
  }
}

// Test 3: Health check
const healthStatus = ref(null);

async function testHealth() {
  loading.value = true;
  error.value = null;

  try {
    console.log('🧪 Test 3: Health check');
    const isHealthy = await geminiAPI.healthCheck();
    healthStatus.value = isHealthy;
    console.log('✅ Status:', isHealthy ? 'Working' : 'Failed');
  } catch (err) {
    error.value = err.message;
    healthStatus.value = false;
    console.error('❌ Error:', err);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.test-gemini {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

h2 {
  color: #2c3e50;
  margin-bottom: 2rem;
}

.model-info {
  background: #e3f2fd;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #2196f3;
}

.model-info p {
  margin: 0.25rem 0;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #2c3e50;
}

.test-section {
  background: #f8f9fa;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

h3 {
  color: #34495e;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

button {
  background: #4caf50;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

button:hover:not(:disabled) {
  background: #45a049;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.result p {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.success {
  color: #4caf50;
  font-weight: bold;
}

.error {
  color: #f44336;
  font-weight: bold;
}

.error-box {
  background: #ffebee;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #f44336;
  margin-top: 1.5rem;
}

.error-box h3 {
  color: #c62828;
  margin-bottom: 0.5rem;
}

.error-box pre {
  color: #d32f2f;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
