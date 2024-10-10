const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const carWidth = 50;
const carHeight = 100;
let carX = (canvas.width - carWidth) / 2;
let carY = canvas.height - carHeight - 10;
let carSpeed = 3;
let gameSpeed = 2;
let gameOver = false;
let gameWon = false;
let obstacles = [];
let powerUps = [];
let crown = null;
let score = 0;
let distance = 0;
let lives = 3; // Added lives
let scores = JSON.parse(localStorage.getItem("scores")) || [];
let highScore = Math.max(...scores, 0);
let lastObstacleSpawn = 0;
let lastPowerUpSpawn = 0;
let lastCrownSpawn = 0;
let lastFrameTime = 0;

// Load images with onload handlers
let imagesLoaded = false;

const carImage = new Image();
carImage.src = "car.png"; // Load the car image
carImage.onload = checkIfImagesLoaded; // Check once loaded

const crownImage = new Image();
crownImage.src = "crown.png"; // Load the crown image
crownImage.onload = checkIfImagesLoaded; // Check once loaded

// Load multiple obstacle images
const obstacleImages = [
  "obstacle1.png",
  "obstacle2.png",
  "obstacle3.png",
  "obstacle4.png",
  "obstacle5.png",
].map((src) => {
  let img = new Image();
  img.src = src;
  img.onload = checkIfImagesLoaded; // Check once loaded
  return img;
});

// Load multiple item images
const itemImages = [
  "item1.png",
  "item2.png",
  "item3.png",
  "item4.png",
  "item5.png",
].map((src) => {
  let img = new Image();
  img.src = src;
  img.onload = checkIfImagesLoaded; // Check once loaded
  return img;
});

// Check if all images are loaded
let totalImagesToLoad = 1 + obstacleImages.length + itemImages.length;
let imagesCurrentlyLoaded = 0;

function checkIfImagesLoaded() {
  imagesCurrentlyLoaded++;
  if (imagesCurrentlyLoaded >= totalImagesToLoad) {
    imagesLoaded = true;
    // Once all images are loaded, start the game
    updateGame();
  }
}

const obstacleMinGap = 80;
const itemMinGap = 80;

// WASD controls for desktop (only left and right now)
document.addEventListener("keydown", function (e) {
  switch (e.key) {
    case "a": // Move left
      if (carX - carSpeed >= 0) carX -= carSpeed;
      break;
    case "d": // Move right
      if (carX + carWidth + carSpeed <= canvas.width) carX += carSpeed;
      break;
      // Disable W and S completely
    case "w":
    case "s":
      e.preventDefault();
      break;
  }
});

// Touch controls for mobile
let touchStartX = 0;
let touchEndX = 0;
document.addEventListener("touchstart", function (e) {
  touchStartX = e.touches[0].clientX;
});
document.addEventListener("touchmove", function (e) {
  touchEndX = e.touches[0].clientX;
  let deltaX = touchEndX - touchStartX;
  if (Math.abs(deltaX) > 50) {
    if (deltaX < 0) {
      moveCarLeft();
    } else {
      moveCarRight();
    }
    touchStartX = touchEndX;
  }
});
document.addEventListener("touchend", function (e) {
  boostSpeed();
});

function moveCarLeft() {
  carX -= 30;
  if (carX < 0) carX = 0;
}

function moveCarRight() {
  carX += 30;
  if (carX + carWidth > canvas.width) carX = canvas.width - carWidth;
}

function boostSpeed() {
  carSpeed = 5;
  setTimeout(() => {
    carSpeed = 2;
  }, 1000);
}

function drawCar() {
  if (carImage.complete) {
    ctx.drawImage(carImage, carX, carY, carWidth, carHeight); // Draw car image
  }
}

function drawObstacles(deltaTime) {
  obstacles.forEach((obs) => {
    let obstacleImage = obstacleImages[obs.type];
    if (obstacleImage.complete) {
      ctx.drawImage(obstacleImage, obs.x, obs.y, obs.width, obs.height);
    }
    obs.y += gameSpeed * deltaTime * 100; // Scale by deltaTime
  });
  obstacles = obstacles.filter((obs) => obs.y < canvas.height);
}

function drawPowerUps(deltaTime) {
  powerUps.forEach((pu) => {
    let itemImage = itemImages[pu.type];
    if (itemImage.complete) {
      ctx.drawImage(itemImage, pu.x, pu.y, pu.width, pu.height);
    }
    pu.y += gameSpeed * deltaTime * 100;
  });
  powerUps = powerUps.filter((pu) => pu.y < canvas.height);
}

function drawCrown(deltaTime) {
  if (crown) {
    ctx.drawImage(crownImage, crown.x, crown.y, crown.width, crown.height);
    crown.y += gameSpeed * deltaTime * 100;
  }
}

function checkCollision(rect1, rect2) {
  const buffer = 5; // Add some buffer to improve detection accuracy
  return !(
    rect1.x > rect2.x + rect2.width + buffer ||
    rect1.x + rect1.width + buffer < rect2.x ||
    rect1.y > rect2.y + rect2.height + buffer ||
    rect1.y + rect1.height + buffer < rect2.y
  );
}

function isValidObstaclePosition(newObstacle) {
  return (
    !obstacles.some((obs) => {
      const xOverlap =
        Math.abs(newObstacle.x - obs.x) < newObstacle.width + obstacleMinGap;
      const yOverlap =
        Math.abs(newObstacle.y - obs.y) < newObstacle.height + obstacleMinGap;
      return xOverlap && yOverlap;
    }) &&
    !powerUps.some((pu) => {
      const xOverlap =
        Math.abs(newObstacle.x - pu.x) < newObstacle.width + itemMinGap;
      const yOverlap =
        Math.abs(newObstacle.y - pu.y) < newObstacle.height + itemMinGap;
      return xOverlap && yOverlap;
    }) &&
    (!crown ||
      (Math.abs(newObstacle.x - crown.x) >= newObstacle.width + itemMinGap &&
        Math.abs(newObstacle.y - crown.y) >= newObstacle.height + itemMinGap))
  );
}

function spawnObstacle() {
  let obstacleWidth = 50;
  let obstacleHeight = 100;
  let newObstacle = {
    x: Math.random() * (canvas.width - obstacleWidth),
    y: -obstacleHeight,
    width: obstacleWidth,
    height: obstacleHeight,
    type: Math.floor(Math.random() * obstacleImages.length), // Select random obstacle type
  };

  if (isValidObstaclePosition(newObstacle)) {
    obstacles.push(newObstacle);
  }
}

function isValidItemPosition(newItem) {
  return (
    !obstacles.some((obs) => {
      const xOverlap = Math.abs(newItem.x - obs.x) < newItem.width + itemMinGap;
      const yOverlap =
        Math.abs(newItem.y - obs.y) < newItem.height + itemMinGap;
      return xOverlap && yOverlap;
    }) &&
    !powerUps.some((pu) => {
      const xOverlap = Math.abs(newItem.x - pu.x) < newItem.width + itemMinGap;
      const yOverlap = Math.abs(newItem.y - pu.y) < newItem.height + itemMinGap;
      return xOverlap && yOverlap;
    })
  );
}

function spawnPowerUp() {
  let powerUpWidth = 30;
  let powerUpHeight = 30;
  let newPowerUp = {
    x: Math.random() * (canvas.width - powerUpWidth),
    y: -powerUpHeight,
    width: powerUpWidth,
    height: powerUpHeight,
    type: Math.floor(Math.random() * itemImages.length), // Select random item type
  };

  if (isValidItemPosition(newPowerUp)) {
    powerUps.push(newPowerUp);
  }
}

function spawnCrown() {
  if (!crown) {
    let crownWidth = 40;
    let crownHeight = 40;
    let newCrown = {
      x: Math.random() * (canvas.width - crownWidth),
      y: -crownHeight,
      width: crownWidth,
      height: crownHeight,
    };

    if (isValidItemPosition(newCrown)) {
      crown = newCrown;
    }
  }
}

let invincible = false; // To track if the car is invincible after a collision
let invincibilityDuration = 1000; // Invincibility duration in milliseconds (2 second)

// Function to handle collisions and update lives
function detectCollisions() {
  obstacles.forEach((obs, index) => {
    if (
      checkCollision({
          x: carX,
          y: carY,
          width: carWidth,
          height: carHeight
        },
        obs
      )
    ) {
      if (!invincible) {
        lives--;
        updateLivesDisplay();

        if (lives <= 0) {
          endGame(false);
        } else {
          // Make car invincible for a short period to avoid immediate life loss again
          invincible = true;
          setTimeout(() => {
            invincible = false;
          }, invincibilityDuration);
        }

        // Remove the collided obstacle
        obstacles.splice(index, 1);
      }
    }
  });

  powerUps.forEach((pu, index) => {
    if (
      checkCollision({
          x: carX,
          y: carY,
          width: carWidth,
          height: carHeight
        },
        pu
      )
    ) {
      powerUps.splice(index, 1);
      boostSpeed();
      score += 10;
      updateScore();
    }
  });

  if (
    crown &&
    checkCollision({
        x: carX,
        y: carY,
        width: carWidth,
        height: carHeight
      },
      crown
    )
  ) {
    endGame(true);
  }
}

function updateScore() {
  document.getElementById("scoreBoard").textContent = `Score: ${score}`;
}

// Function to update the lives display in the UI
function updateLivesDisplay() {
  document.getElementById("livesDisplay").textContent = `Lives: ${lives}`;
}

function updateLeaderboard() {
  document.getElementById("highScore").textContent = `High Score: ${highScore}`;
  let scoreList = document.getElementById("scoreList");
  scoreList.innerHTML = ""; // Clear the list before repopulating

  scores.forEach((score) => {
    let li = document.createElement("li");
    li.textContent = `Score: ${score}`;
    scoreList.appendChild(li);
  });
}

function endGame(won) {
  gameOver = true;
  if (won) {
    document.getElementById("gameWon").style.display = "block";
  } else {
    document.getElementById("gameOver").style.display = "block";
  }
  // Add the current score to the leaderboard and update localStorage
  scores.push(score);
  localStorage.setItem("scores", JSON.stringify(scores));
  if (scores.length > 10) {
    scores.shift();
    localStorage.setItem("scores", JSON.stringify(scores));
  }

  // Update the high score if necessary
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }

  // Update the leaderboard UI
  updateLeaderboard();
  document.getElementById("restartButton").style.display = "block";
}
window.onload = function () {
  updateLeaderboard();
};

function restartGame() {
  gameOver = false;
  gameWon = false;
  obstacles = [];
  powerUps = [];
  crown = null;
  score = 0;
  distance = 0;
  lives = 3;
  lastObstacleSpawn = 0;
  lastPowerUpSpawn = 0;
  lastCrownSpawn = 0;
  lastFrameTime = 0;

  carX = (canvas.width - carWidth) / 2;
  carY = canvas.height - carHeight - 10;
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("gameWon").style.display = "none";
  document.getElementById("restartButton").style.display = "none";
  document.getElementById("scoreBoard").textContent = "Score: 0";
  document.getElementById("livesDisplay").textContent = "Lives: 3";
  gameSpeed = 2;
  updateGame();
}

document.getElementById("restartButton").addEventListener("click", restartGame);

document.getElementById("startButton").addEventListener("click", function () {
  // Hide start menu and show game container
  document.getElementById("startMenu").style.display = "none";
  document.getElementById("gameContainer").style.display = "block";

  // Start the game
  updateGame();
});

function updateGame(currentTime) {
  if (!imagesLoaded || gameOver) return;

  let deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCar();
  drawObstacles(deltaTime);
  drawPowerUps(deltaTime);
  drawCrown(deltaTime);

  detectCollisions();

  // Use time instead of distance for spawning
  if (currentTime - lastObstacleSpawn > 1000) {
    // spawn every 1 second
    spawnObstacle();
    lastObstacleSpawn = currentTime;
  }
  if (currentTime - lastPowerUpSpawn > 2000) {
    // spawn every 2 seconds
    spawnPowerUp();
    lastPowerUpSpawn = currentTime;
  }
  if (currentTime - lastCrownSpawn > 10000) {
    // spawn every 10 seconds
    spawnCrown();
    lastCrownSpawn = currentTime;
  }

  requestAnimationFrame(updateGame);
}