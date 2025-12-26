// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './main.css';
import router from './router';
import App from './App.vue';

/**
 * Инициализация Vue приложения
 */

// Создаём экземпляр приложения
const app = createApp(App);

// Создаём и подключаем Pinia (state management)
const pinia = createPinia();
app.use(pinia);
app.use(router);

// Монтируем приложение в DOM
app.mount('#app');

// Загружаем настройки из localStorage при старте
import { useSettingsStore } from './stores/settingsStore';
const settingsStore = useSettingsStore();
settingsStore.loadSettings();

console.log('🎬 Lazy Dubber запущен!');
