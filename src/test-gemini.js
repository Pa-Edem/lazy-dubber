// src/test-gemini.js
import geminiAPI from './services/api/geminiApi.js';

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API...');

  try {
    // Тест 1: Один текст
    console.log('\n--- Test 1: Single translation ---');
    const single = await geminiAPI.translateSingle('Hello, how are you?');
    console.log('Original:', 'Hello, how are you?');
    console.log('Translation:', single);

    // Тест 2: Батч перевод
    console.log('\n--- Test 2: Batch translation ---');
    const batch = await geminiAPI.translateBatch([
      'Good morning!',
      'What time is it?',
      'I love this movie',
      'See you later',
    ]);

    batch.forEach((translation, i) => {
      console.log(`${i + 1}. "${translation}"`);
    });

    // Тест 3: Health check
    console.log('\n--- Test 3: Health check ---');
    const isHealthy = await geminiAPI.healthCheck();
    console.log('API Status:', isHealthy ? '✅ Working' : '❌ Failed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Запускаем тест
testGeminiAPI();
