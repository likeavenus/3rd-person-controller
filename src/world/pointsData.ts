export interface PoiInfo {
  id: string;
  /** Позиция на полу. */
  x: number;
  z: number;
  /** Радиус срабатывания. */
  radius: number;
  color: number;
  badge: string;
  title: string;
  text: string[];
  image: string;
}

const img = (file: string) => `${import.meta.env.BASE_URL}images/about/${file}`;

/**
 * Точки интереса разбросаны вдоль пути к чёрной дыре.
 * Замени картинки в public/images/about на свои фото (можно те же имена .svg
 * или .jpg — тогда поправь поле image).
 */
export const POINTS: PoiInfo[] = [
  {
    id: "about",
    x: -8,
    z: 20,
    radius: 7,
    color: 0x5fa8ff,
    badge: "Обо мне",
    title: "Привет, это я",
    text: [
      "Креативный фронтенд-разработчик с 8 годами опыта.",
      "Соединяю инженерную точность с творческим подходом — от продакшен-дашбордов до интерактивных 3D-сайтов вроде этого.",
    ],
    image: "me.svg",
  },
  {
    id: "exp",
    x: 9,
    z: 8,
    radius: 7,
    color: 0xc79bff,
    badge: "Путь",
    title: "8 лет в профессии",
    text: [
      "Запускал SPA и SSR-приложения, дизайн-системы, realtime-дашборды и WebGL-визуализации.",
      "Менторил джунов, выстраивал архитектуру фронтенда, доводил фичи от идеи до прода.",
    ],
    image: "life1.svg",
  },
  {
    id: "stack",
    x: -9,
    z: -3,
    radius: 7,
    color: 0x5fd0ff,
    badge: "Инструменты",
    title: "Технологический стек",
    text: [
      "React, TypeScript, Next.js, Three.js / WebGL, GLSL-шейдеры, GSAP, Node.js, Vite.",
      "Тестирование и CI/CD. Новый инструмент — повод для радости, а не стресса.",
    ],
    image: "stack.svg",
  },
  {
    id: "life",
    x: 8,
    z: -13,
    radius: 7,
    color: 0x6fe0c0,
    badge: "Вне кода",
    title: "Жизнь за экраном",
    text: [
      "Люблю эксперименты с генеративной графикой, музыку и путешествия.",
      "Вдохновение для интерфейсов часто приходит вообще не из кода.",
    ],
    image: "life2.svg",
  },
];
