import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let cameraDistance = 5;
let cameraAngleX = 0;
let cameraAngleY = Math.PI / 4; // Немного сверху
let isMouseDown = false;
let previousMouseX = 0;
let previousMouseY = 0;

// Сцена и рендерер
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Камера
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Пол
const floorGeometry = new THREE.PlaneGeometry(50, 50);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Сетка
const gridHelper = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
(gridHelper.material as THREE.Material).opacity = 0.1;
(gridHelper.material as THREE.Material).transparent = true;
scene.add(gridHelper);

// Переменные для персонажа
const loader = new GLTFLoader();
let model: THREE.Group;
let mixer: THREE.AnimationMixer;
let currentAnimation: string = "idle";

// Состояние управления
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
};

// Параметры персонажа
const characterState = {
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  currentSpeed: 0,
  walkSpeed: 2,
  runSpeed: 5,
};

let actions: { [key: string]: THREE.AnimationAction } = {};

// Загрузка модели
// В функции загрузки модели замените создание actions:
loader.load(
  "/models/character.glb",
  function (gltf) {
    model = gltf.scene;

    console.log("✅ Модель загружена");
    console.log(
      "📹 Анимации:",
      gltf.animations.map((a) => a.name)
    );

    // Настройка модели
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Центрируем модель
    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    model.position.set(-center.x, 0, -center.z);

    scene.add(model);

    // Animation Mixer
    mixer = new THREE.AnimationMixer(model);

    // В функции загрузки модели, после создания actions добавьте:
    gltf.animations.forEach((clip) => {
      actions[clip.name] = mixer.clipAction(clip);

      // Для циклических анимаций
      if (clip.name === "idle" || clip.name === "walk" || clip.name === "run") {
        actions[clip.name].setLoop(THREE.LoopRepeat, Infinity);
      }

      // Для одноразовых анимаций с НАСТРОЙКОЙ СКОРОСТИ
      if (clip.name === "jump" || clip.name === "high_kick") {
        actions[clip.name].setLoop(THREE.LoopOnce);
        actions[clip.name].clampWhenFinished = true;

        // УСКОРЕНИЕ АНИМАЦИЙ - регулируйте эти значения
        if (clip.name === "jump") {
          actions[clip.name].setEffectiveTimeScale(1.3); // Ускорить прыжок в 1.5 раза
        }
        if (clip.name === "high_kick") {
          actions[clip.name].setEffectiveTimeScale(1.3); // Ускорить удар в 1.8 раза
        }
      }
    });

    console.log("🎬 Созданы действия:", Object.keys(actions));

    // Запускаем анимацию idle по умолчанию
    if (actions["idle"]) {
      actions["idle"].play();
      currentAnimation = "idle";
      console.log("▶️ Запущена анимация: idle");
    }

    setupEventListeners();
    // createAnimationTester(actions);
  },
  undefined,
  function (error) {
    console.error("❌ Ошибка загрузки модели:", error);
  }
);

// Для плавности - интерполяция значений камеры
let targetCameraAngleX = cameraAngleX;
let targetCameraAngleY = cameraAngleY;
let targetCameraDistance = cameraDistance;

// Обработка ввода
// Обработка ввода
function setupEventListeners() {
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = true;
    if (event.key === "Shift") keys.shift = true;
    if (event.code === "Space" && !isPlayingOneShot) {
      playOneShotAnimation("jump");
    }

    // Удар на клавишу E (только если не воспроизводится другая одноразовая анимация)
    if (event.key === "e" && !isPlayingOneShot) {
      playOneShotAnimation("high_kick");
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = false;
    if (event.key === "Shift") keys.shift = false;
  });

  // Управление камерой GTA-style
  document.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      // Левая кнопка мыши
      isMouseDown = true;
      previousMouseX = event.clientX;
      previousMouseY = event.clientY;
    }
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      isMouseDown = false;
    }
  });

  // Обновите обработчик mousemove:
  document.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
      const deltaX = event.clientX - previousMouseX;
      const deltaY = event.clientY - previousMouseY;

      // Плавное изменение углов
      targetCameraAngleX -= deltaX * 0.01;
      targetCameraAngleY -= deltaY * 0.01;

      // Ограничиваем вертикальный угол
      targetCameraAngleY = Math.max(0.1, Math.min(Math.PI / 2, targetCameraAngleY));

      previousMouseX = event.clientX;
      previousMouseY = event.clientY;
    }
  });

  document.addEventListener("wheel", (event) => {
    targetCameraDistance += event.deltaY * 0.01;
    targetCameraDistance = Math.max(3, Math.min(15, targetCameraDistance));
  });

  // Блокируем контекстное меню на правый клик
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

// Обновление движения персонажа
function updateCharacter(delta: number) {
  if (!model || !mixer) return;

  characterState.direction.set(0, 0, 0);

  // Движение относительно камеры
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();

  const cameraRight = new THREE.Vector3();
  cameraRight.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();

  const moveDirection = new THREE.Vector3();

  if (keys.w) moveDirection.add(cameraDirection);
  if (keys.s) moveDirection.sub(cameraDirection);
  if (keys.a) moveDirection.add(cameraRight);
  if (keys.d) moveDirection.sub(cameraRight);

  if (moveDirection.length() > 0) {
    moveDirection.normalize();
    characterState.direction.copy(moveDirection);
  }

  // Определяем скорость
  const targetSpeed = keys.shift ? characterState.runSpeed : characterState.walkSpeed;
  characterState.currentSpeed = characterState.direction.length() > 0 ? targetSpeed : 0;

  // Обновляем позицию
  if (characterState.currentSpeed > 0) {
    model.position.x += characterState.direction.x * characterState.currentSpeed * delta;
    model.position.z += characterState.direction.z * characterState.currentSpeed * delta;

    // ИСПРАВЛЕННЫЙ ПОВОРОТ - избегаем проблем с кратчайшим путем
    if (characterState.direction.length() > 0.1) {
      const targetRotation = Math.atan2(characterState.direction.x, characterState.direction.z);

      // Вычисляем разницу между текущим и целевым углом
      let angleDifference = targetRotation - model.rotation.y;

      // Нормализуем разницу в диапазон [-PI, PI]
      while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
      while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;

      // Плавный поворот с учетом кратчайшего пути
      const rotationSpeed = 8; // Скорость поворота (можно настроить)
      const rotationStep = angleDifference * Math.min(rotationSpeed * delta, 1);

      model.rotation.y += rotationStep;
    }
  }

  // Обновляем анимации
  updateAnimations();
}
// Простая система анимаций
// Объявите переменную actions в глобальной области

// Добавьте новые переменные в начало файла
let currentBaseAnimation = "idle"; // Основная анимация (idle, walk, run)
let isPlayingOneShot = false; // Флаг для одноразовых анимаций
let oneShotAnimation: string | null = null; // Текущая одноразовая анимация

// Обновите функцию updateAnimations
function updateAnimations() {
  if (!mixer || Object.keys(actions).length === 0 || isPlayingOneShot) return;

  const isMoving = characterState.currentSpeed > 0;
  const isRunning = characterState.currentSpeed === characterState.runSpeed;

  let targetAnimation = "idle";

  if (isMoving) {
    if (isRunning) {
      targetAnimation = "run";
    } else {
      targetAnimation = "walk";
    }
  }

  // Если анимация уже играет, не переключаем
  if (targetAnimation === currentBaseAnimation) return;

  console.log(`🔄 Смена базовой анимации: ${currentBaseAnimation} -> ${targetAnimation}`);

  // Плавное переключение анимаций
  if (actions[currentBaseAnimation]) {
    actions[currentBaseAnimation].fadeOut(0.2);
  }

  if (actions[targetAnimation]) {
    actions[targetAnimation].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();
  }

  currentBaseAnimation = targetAnimation;
  currentAnimation = targetAnimation;
}

// Функция для воспроизведения одноразовых анимаций
function playOneShotAnimation(animationName: string) {
  if (!mixer || !actions[animationName] || isPlayingOneShot) return;

  console.log(`🎬 Запуск одноразовой анимации: ${animationName}`);

  // Устанавливаем флаг
  isPlayingOneShot = true;
  oneShotAnimation = animationName;

  // Сохраняем текущую анимацию для возврата
  const previousAnimation = currentBaseAnimation;

  // Плавно переходим к одноразовой анимации
  if (actions[currentBaseAnimation]) {
    actions[currentBaseAnimation].fadeOut(0.1);
  }

  // Запускаем одноразовую анимацию
  actions[animationName].reset().setEffectiveWeight(1).fadeIn(0.1).play();

  // Слушаем завершение анимации
  mixer.addEventListener("finished", function onAnimationFinished(event) {
    if (event.action === actions[animationName]) {
      // Убираем слушатель
      mixer.removeEventListener("finished", onAnimationFinished);

      // Возвращаемся к предыдущей анимации
      if (actions[previousAnimation]) {
        actions[animationName].fadeOut(0.2);
        actions[previousAnimation].reset().fadeIn(0.2).play();
      }

      // Сбрасываем флаги
      isPlayingOneShot = false;
      oneShotAnimation = null;
      currentAnimation = previousAnimation;

      console.log(`🔄 Возврат к анимации: ${previousAnimation}`);
    }
  });
}

function updateCamera() {
  if (!model) return;

  // Вычисляем позицию камеры на основе углов и расстояния
  const cameraPos = new THREE.Vector3();

  // Сферические координаты в декартовы
  cameraPos.x = model.position.x + cameraDistance * Math.sin(cameraAngleX) * Math.cos(cameraAngleY);
  cameraPos.y = model.position.y + cameraDistance * Math.sin(cameraAngleY);
  cameraPos.z = model.position.z + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);

  // Плавное перемещение камеры
  camera.position.lerp(cameraPos, 0.1);

  // Камера всегда смотрит на персонажа
  camera.lookAt(model.position.x, model.position.y + 1, model.position.z);
}

// Основной цикл
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Плавное обновление параметров камеры
  cameraAngleX = THREE.MathUtils.lerp(cameraAngleX, targetCameraAngleX, 0.1);
  cameraAngleY = THREE.MathUtils.lerp(cameraAngleY, targetCameraAngleY, 0.1);
  cameraDistance = THREE.MathUtils.lerp(cameraDistance, targetCameraDistance, 0.1);

  if (mixer) mixer.update(delta);
  updateCharacter(delta);
  updateCamera();

  renderer.render(scene, camera);
}

// Запуск
animate();

// Инструкция
const infoDiv = document.createElement("div");
infoDiv.style.position = "absolute";
infoDiv.style.top = "10px";
infoDiv.style.left = "10px";
infoDiv.style.zIndex = "100";
infoDiv.style.background = "rgba(0,0,0,0.7)";
infoDiv.style.color = "white";
infoDiv.style.padding = "10px";
infoDiv.style.borderRadius = "5px";
infoDiv.style.fontFamily = "Arial, sans-serif";
infoDiv.innerHTML = `
  <div style="font-weight: bold; margin-bottom: 5px;">🎮 Управление GTA-style</div>
  <div>WASD - Движение персонажа</div>
  <div>Shift - Бег</div>
  <div>ЛКМ + перемещение - Вращение камеры</div>
  <div>Колесико - Приближение/отдаление</div>
`;
document.body.appendChild(infoDiv);

// Обработка изменения размера
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
