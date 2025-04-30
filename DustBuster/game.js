const config = {
  type: Phaser.AUTO,
  width: window.innerWidth, // Адаптивная ширина для мобильных устройств
  height: window.innerHeight, // Адаптивная высота
  scene: {
    preload: preload,
    create: create,
    update: update // Убедитесь, что функция update указана здесь
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT, // Автоматическое масштабирование под экран
    autoCenter: Phaser.Scale.CENTER_BOTH, // Центрирование игры
    orientation: Phaser.Scale.LANDSCAPE // Фиксация в ландшафтной ориентации
  }
};

const game = new Phaser.Game(config);

let player;
let enemies;
let hearts; // Группа для сердечек
let score = 0;
let energy = 100;
let dustBag = 0; // Заполненность мешка
let isGameOver = false;

// Настройки сложности
let enemySpeed = 10; // Начальная скорость противников
let spawnDelay = 5000; // Начальная задержка между появлением противников

function preload() {
  // Загрузка изображений
  this.load.image('player', 'assets/player.png'); // Базовый спрайт героя
  this.load.image('player_up_left', 'assets/player_up_left.png'); // Спрайт героя (вверх-влево)
  this.load.image('player_up_right', 'assets/player_up_right.png'); // Спрайт героя (вверх-вправо)
  this.load.image('player_down_left', 'assets/player_down_left.png'); // Спрайт героя (вниз-влево)
  this.load.image('player_down_right', 'assets/player_down_right.png'); // Спрайт героя (вниз-вправо)
  this.load.image('enemy', 'assets/enemy.png'); // Спрайт противника
  this.load.image('heart_small', 'assets/heart_small.png'); // Маленькое сердечко (+10 энергии)
  this.load.image('heart_big', 'assets/heart_big.png'); // Большое сердечко (+50 энергии)
  this.load.image('background1', 'assets/background1.png'); // Фон 1
  this.load.image('background2', 'assets/background2.png'); // Фон 2
  this.load.image('background3', 'assets/background3.png'); // Фон 3
  this.load.image('bag', 'assets/bag.png'); // Иконка мешка для пыли
  this.load.image('arrow_up_left', 'assets/arrow_up_left.png'); // Иконка стрелки (вверх-влево)
  this.load.image('arrow_up_right', 'assets/arrow_up_right.png'); // Иконка стрелки (вверх-вправо)
  this.load.image('arrow_down_left', 'assets/arrow_down_left.png'); // Иконка стрелки (вниз-влево)
  this.load.image('arrow_down_right', 'assets/arrow_down_right.png'); // Иконка стрелки (вниз-вправо)
}

function create() {
  // Полноэкранный режим
  const fullscreenButton = this.add.text(10, 10, 'Fullscreen', { fontSize: '24px', fill: '#fff' }).setInteractive();
  fullscreenButton.on('pointerdown', () => {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  });

  // Фон
  this.currentBackground = this.add.image(config.width / 2, config.height / 2, 'background1');
  this.currentBackground.setDisplaySize(config.width, config.height); // Масштабируем фон под экран

  // Игрок
  player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player'); // Центр экрана
  player.setCollideWorldBounds(true); // Ограничение движения игрока в пределах экрана

  // Настройка границ столкновения для героя
  player.body.setSize(50, 50); // Уменьшаем размер hitbox
  player.body.setOffset(37, 37); // Смещаем hitbox ближе к центру

  // Мешок для пыли (иконка)
  const bag = this.add.image(config.width - 100, 50, 'bag').setInteractive(); // В правом верхнем углу
  bag.on('pointerdown', () => {
    dustBag = 0; // Очистка мешка при нажатии
    updateUI.call(this); // Обновляем интерфейс
  });

  // Виртуальные кнопки для мобильных устройств
  const buttonSize = 100; // Размер кнопок
  const buttonUpLeft = this.add.image(buttonSize, config.height - buttonSize * 2, 'arrow_up_left')
    .setInteractive()
    .setDisplaySize(buttonSize, buttonSize);
  const buttonUpRight = this.add.image(config.width - buttonSize, config.height - buttonSize * 2, 'arrow_up_right')
    .setInteractive()
    .setDisplaySize(buttonSize, buttonSize);
  const buttonDownLeft = this.add.image(buttonSize, config.height - buttonSize, 'arrow_down_left')
    .setInteractive()
    .setDisplaySize(buttonSize, buttonSize);
  const buttonDownRight = this.add.image(config.width - buttonSize, config.height - buttonSize, 'arrow_down_right')
    .setInteractive()
    .setDisplaySize(buttonSize, buttonSize);

  // Обработка нажатий на кнопки
  buttonUpLeft.on('pointerdown', () => setPlayerDirection('up_left'));
  buttonUpLeft.on('pointerup', () => resetPlayerDirection());
  buttonUpRight.on('pointerdown', () => setPlayerDirection('up_right'));
  buttonUpRight.on('pointerup', () => resetPlayerDirection());
  buttonDownLeft.on('pointerdown', () => setPlayerDirection('down_left'));
  buttonDownLeft.on('pointerup', () => resetPlayerDirection());
  buttonDownRight.on('pointerdown', () => setPlayerDirection('down_right'));
  buttonDownRight.on('pointerup', () => resetPlayerDirection());

  // Группа противников
  enemies = this.physics.add.group();

  // Группа сердечек
  hearts = this.physics.add.group();

  // Таймер для создания противников
  this.time.addEvent({
    delay: spawnDelay,
    callback: spawnEnemy,
    callbackScope: this,
    loop: true
  });

  // Таймер для создания сердечек (редкие)
  this.time.addEvent({
    delay: 15000, // Каждые 15 секунд
    callback: spawnHeart,
    callbackScope: this,
    loop: true
  });

  // Текстовые элементы (счет, энергия и заполненность мешка)
  this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', fill: '#fff' });
  this.energyText = this.add.text(10, 40, 'Energy: 100', { fontSize: '24px', fill: '#fff' });
  this.bagText = this.add.text(10, 70, 'Bag: 0%', { fontSize: '24px', fill: '#fff' });

  // Привязываем контекст к updateUI
  this.updateUI = updateUI.bind(this);
}

function update() {
  if (isGameOver) return;

  // Перемещение противников к игроку
  enemies.children.iterate(enemy => {
    this.physics.moveToObject(enemy, player, enemySpeed); // Установка скорости движения
  });

  // Проверка столкновений с противниками
  this.physics.overlap(player, enemies, (player, enemy) => {
    if (dustBag < 100) {
      score += 10; // Увеличение счета
      dustBag += 10; // Заполнение мешка
    }
    enemy.destroy(); // Уничтожение противника
    updateUI.call(this); // Обновление интерфейса

    // Проверка смены фона и сложности
    checkBackgroundChange.call(this);
    checkDifficultyIncrease.call(this);
  });

  // Проверка столкновений с сердечками
  this.physics.overlap(player, hearts, (player, heart) => {
    if (heart.texture.key === 'heart_small') {
      energy += 10; // Маленькое сердечко
    } else if (heart.texture.key === 'heart_big') {
      energy += 50; // Большое сердечко
    }
    heart.destroy(); // Уничтожение сердечка
    updateUI.call(this); // Обновление интерфейса
  });
}

function setPlayerDirection(direction) {
  switch (direction) {
    case 'up_left':
      player.setTexture('player_up_left');
      break;
    case 'up_right':
      player.setTexture('player_up_right');
      break;
    case 'down_left':
      player.setTexture('player_down_left');
      break;
    case 'down_right':
      player.setTexture('player_down_right');
      break;
  }
}

function resetPlayerDirection() {
  player.setTexture('player'); // Возвращаем исходный спрайт
}

function spawnEnemy() {
  const x = Phaser.Math.Between(0, config.width); // Случайная позиция по X
  const y = Phaser.Math.Between(0, config.height); // Случайная позиция по Y
  const enemy = enemies.create(x, y, 'enemy'); // Создание нового противника
  enemy.setScale(0.5); // Уменьшение размера противника

  // Настройка границ столкновения для противника
  enemy.body.setSize(30, 30); // Уменьшаем размер hitbox
  enemy.body.setOffset(10, 10); // Смещаем hitbox ближе к центру
}

function spawnHeart() {
  const x = Phaser.Math.Between(0, config.width); // Случайная позиция по X
  const y = Phaser.Math.Between(0, config.height); // Случайная позиция по Y
  const heartType = Phaser.Math.Between(0, 1) ? 'heart_small' : 'heart_big'; // Случайный тип сердечка
  const heart = hearts.create(x, y, heartType); // Создание сердечка
  heart.setScale(0.5); // Уменьшение размера сердечка

  // Движение сердечка к игроку
  this.physics.moveToObject(heart, player, 50); // Медленное движение
}

function checkBackgroundChange() {
  if (score >= 200 && score < 400 && this.currentBackground.texture.key !== 'background2') {
    this.currentBackground.setTexture('background2'); // Смена фона
  } else if (score >= 600 && this.currentBackground.texture.key !== 'background3') {
    this.currentBackground.setTexture('background3'); // Смена фона
  }
}

function checkDifficultyIncrease() {
  if (score % 200 === 0) {
    enemySpeed += 3; // Увеличение скорости противников
    spawnDelay -= 10; // Уменьшение задержки между появлением противников
    if (spawnDelay < 200) spawnDelay = 200; // Минимальная задержка
  }
}

function updateUI() {
  // Обновление текстовых элементов
  this.scoreText.setText(`Score: ${score}`);
  this.energyText.setText(`Energy: ${energy}`);
  this.bagText.setText(`Bag: ${dustBag}%`);
}

function gameOver() {
  isGameOver = true; // Остановка игры
  alert('Game Over!'); // Сообщение о конце игры
  location.reload(); // Перезагрузка страницы
}