// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import UploadView from '../views/UploadView.vue';

/**
 * Определяем маршруты приложения
 * Каждый объект описывает одну страницу
 */
const routes = [
  {
    path: '/',
    name: 'upload',
    component: UploadView,
  },
  // На следующих этапах здесь появятся:
  // { path: '/player', name: 'player', component: PlayerView }
];

/**
 * Создаём экземпляр роутера
 */
const router = createRouter({
  /**
   * history - режим работы роутера
   *
   * createWebHistory() - использует HTML5 History API
   * URL выглядят как обычные: /about, /player
   * Требует настройки сервера для продакшена
   *
   * Альтернатива: createWebHashHistory()
   * URL выглядят так: /#/about, /#/player
   * Работает без настройки сервера, но выглядит хуже
   */
  history: createWebHistory(),

  routes, // Наш массив маршрутов
});

export default router;
