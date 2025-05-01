const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    orientation: Phaser.Scale.LANDSCAPE
  }
};

// Константы
const spawnDelay = 2000; // Задержка появления пыли
const enemySpeed = 150; // Скорость пыли
const playerSpeed = 200; // Скорость игрока

const game = new Phaser.Game(config);
let player;
let enemies;
let hearts;
let score = 0;
let energy = 100;
let dustBag = 0;
let isGameOver = false;
let currentDirection = 'default';

// Звуковые переменные
let backgroundMusic;
let collectSound;
let damageSound;
let restoreSound;
let clearBagSound;
let gameOverSound;

function preload() {
  // Спрайты
  this.load.image('player', 'assets/player.png');
  this.load.image('player_up_left', 'assets/player_up_left.png');
  this.load.image('player_up_right', 'assets/player_up_right.png');
  this.load.image('player_down_left', 'assets/player_down_left.png');
  this.load.image('player_down_right', 'assets/player_down_right.png');
  this.load.image('enemy', 'assets/enemy.png');
  this.load.image('heart_small', 'assets/heart_small.png');
  this.load.image('heart_big', 'assets/heart_big.png');
  this.load.image('background1', 'assets/background1.png');
  this.load.image('arrow_up_left', 'assets/arrow_up_left.png');
  this.load.image('arrow_up_right', 'assets/arrow_up_right.png');
  this.load.image('arrow_down_left', 'assets/arrow_down_left.png');
  this.load.image('arrow_down_right', 'assets/arrow_down_right.png');
  this.load.image('bag', 'assets/bag.png');

  // Звуки
  this.load.audio('collect_dust', 'assets/sounds/collect_dust.mp3');
  this.load.audio('damage', 'assets/sounds/damage.mp3');
  this.load.audio('restore_energy', 'assets/sounds/restore_energy.mp3');
  this.load.audio('clear_bag', 'assets/sounds/clear_bag.mp3');
  this.load.audio('game_over', 'assets/sounds/game_over.mp3');
  this.load.audio('background_music', 'assets/sounds/background_music.mp3');
}

function create() {
  // Инициализация переменных
  currentDirection = 'default';
  dustBag = 0;
  
  // Фоновая музыка
  backgroundMusic = this.sound.add('background_music', { loop: true, volume: 0.3 });
  backgroundMusic.play();

  // Фон
  this.currentBackground = this.add.image(config.width / 2, config.height / 2, 'background1');
  this.currentBackground.setDisplaySize(config.width, config.height);

  // Игрок
  player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player');
  player.setCollideWorldBounds(true);
  player.body.setSize(50, 50).setOffset(37, 37);

  // Мешок для пыли
  const bag = this.add.image(config.width - 100, 50, 'bag').setInteractive();
  bag.on('pointerdown', () => {
    dustBag = 0;
    clearBagSound.play();
    updateUI.call(this);
  });

  // Виртуальные кнопки
  const buttonSize = 120;
  const createButton = (x, y, texture, direction) => {
    const btn = this.add.image(x, y, texture)
      .setInteractive()
      .setDisplaySize(buttonSize, buttonSize)
      .setAlpha(0.8);
    btn.on('pointerdown', () => setPlayerDirection.call(this, direction));
    btn.on('pointerup', () => resetPlayerDirection.call(this));
  };

  createButton(buttonSize, config.height - buttonSize * 2, 'arrow_up_left', 'up_left');
  createButton(config.width - buttonSize, config.height - buttonSize * 2, 'arrow_up_right', 'up_right');
  createButton(buttonSize, config.height - buttonSize, 'arrow_down_left', 'down_left');
  createButton(config.width - buttonSize, config.height - buttonSize, 'arrow_down_right', 'down_right');

  // Группы объектов
  enemies = this.physics.add.group();
  hearts = this.physics.add.group();

  // Таймеры
  this.time.addEvent({ 
    delay: spawnDelay, 
    callback: () => spawnEnemy.call(this), 
    loop: true 
  });
  this.time.addEvent({ 
    delay: 15000, 
    callback: () => spawnHeart.call(this), 
    loop: true 
  });

  // Текстовые элементы
  this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', fill: '#fff' });
  this.energyText = this.add.text(10, 40, 'Energy: 100', { fontSize: '24px', fill: '#fff' });
  this.bagText = this.add.text(10, 70, 'Bag: 0%', { fontSize: '24px', fill: '#fff' });

  // Инициализация звуков
  collectSound = this.sound.add('collect_dust');
  damageSound = this.sound.add('damage');
  restoreSound = this.sound.add('restore_energy');
  clearBagSound = this.sound.add('clear_bag');
  gameOverSound = this.sound.add('game_over');
}

function update() {
  if (isGameOver) return;

  // Плавное движение игрока
  switch(currentDirection) {
    case 'up_left':
      player.setVelocity(-playerSpeed, -playerSpeed);
      break;
    case 'up_right':
      player.setVelocity(playerSpeed, -playerSpeed);
      break;
    case 'down_left':
      player.setVelocity(-playerSpeed, playerSpeed);
      break;
    case 'down_right':
      player.setVelocity(playerSpeed, playerSpeed);
      break;
    default:
      player.setVelocity(0);
  }

  // Перемещение противников
  enemies.children.iterate(enemy => {
    this.physics.moveToObject(enemy, player, enemySpeed);
  });

  // Проверка столкновений
  this.physics.overlap(player, enemies, (player, enemy) => {
    if (currentDirection === enemy.direction) {
      if (dustBag < 100) {
        score += 10;
        dustBag += 10;
        collectSound.play();
      }
    } else {
      energy -= 10;
      damageSound.play();
    }
    enemy.destroy();
    updateUI.call(this);
    checkGameOver.call(this);
  });

  this.physics.overlap(player, hearts, (player, heart) => {
    energy = Math.min(energy + (heart.texture.key === 'heart_small' ? 10 : 50), 100);
    heart.destroy();
    restoreSound.play();
    updateUI.call(this);
  });
}

function setPlayerDirection(direction) {
  currentDirection = direction;
  player.setTexture(`player_${direction}`);
}

function resetPlayerDirection() {
  currentDirection = 'default';
  player.setTexture('player');
}

function spawnEnemy() {
  const spawnPoints = [
    { x: 0, y: 0, direction: 'up_left' },
    { x: config.width, y: 0, direction: 'up_right' },
    { x: 0, y: config.height, direction: 'down_left' },
    { x: config.width, y: config.height, direction: 'down_right' }
  ];

  const randomPoint = Phaser.Utils.Array.GetRandom(spawnPoints);
  if (!randomPoint.direction) return;

  const enemy = enemies.create(randomPoint.x, randomPoint.y, 'enemy');
  enemy.setScale(0.5);
  enemy.body.setSize(30, 30).setOffset(10, 10);
  enemy.direction = randomPoint.direction;

  const angle = Phaser.Math.Angle.Between(randomPoint.x, randomPoint.y, player.x, player.y);
  this.physics.velocityFromRotation(angle, enemySpeed, enemy.body.velocity);
}

function spawnHeart() {
  const heartType = Phaser.Math.Between(0, 1) ? 'heart_small' : 'heart_big';
  const heart = hearts.create(
    Phaser.Math.Between(0, config.width),
    Phaser.Math.Between(0, config.height),
    heartType
  );
  heart.setScale(0.5);
  this.physics.moveToObject(heart, player, 50);
}

function updateUI() {
  this.scoreText.setText(`Score: ${score}`);
  this.energyText.setText(`Energy: ${energy}`);
  this.bagText.setText(`Bag: ${Math.min(dustBag, 100)}%`);
}

function checkGameOver() {
  if (energy <= 0) {
    isGameOver = true;
    gameOverSound.play();
    backgroundMusic.stop();
    alert('Game Over!');
    location.reload();
  }
}