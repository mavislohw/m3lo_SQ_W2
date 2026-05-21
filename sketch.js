// ============================================================
// Week 2 Example 2: Platformer with Platforms Array
// ============================================================

// ------------------------------------------------------------
// PLATFORMS ARRAY
// Each platform is an object with x, y, width, and height.
// x and y are the TOP-LEFT corner (same as rect()).
//
// Storing platforms in an array means:
//   - We can loop through all of them with one for loop
//   - Adding a new platform = adding one line of data
//   - Later we can load this data from a JSON file instead
// ------------------------------------------------------------
let platforms = [
  // { x, y, w, h, type, cracked }
  { x: 0, y: 410, w: 800, h: 40, type: "sushi" }, // ground sushi roll
  { x: 80, y: 310, w: 120, h: 16, type: "sushi" }, // left low sushi
  { x: 160, y: 230, w: 100, h: 16, type: "sushi" }, // left mid sushi
  { x: 140, y: 150, w: 100, h: 16, type: "sushi" }, // left high sushi
  { x: 360, y: 110, w: 110, h: 16, type: "sushi" }, // top centre sushi
  { x: 300, y: 220, w: 140, h: 16, type: "chopstick", cracked: false }, // centre chopstick
  { x: 540, y: 170, w: 120, h: 16, type: "chopstick", cracked: false }, // right high chopstick
  { x: 620, y: 290, w: 130, h: 16, type: "sushi" }, // far right sushi
];

let bgImage;

function preload() {
  bgImage = loadImage(
    "assets/images/wood-plank-texture-seamless-pattern-600nw-2770482183.webp",
  );
}

// ------------------------------------------------------------
// PLAYER OBJECT — same structure as Example 1
// w and h are added here for use in collision detection.
// ------------------------------------------------------------
let player = {
  x: 100,
  y: 100,

  vx: 0, // horizontal velocity
  vy: 0, // vertical velocity

  r: 20, // visual radius for blob drawing and collision

  // Movement tuning — change these to adjust how the game feels
  speed: 0.55, // horizontal acceleration per frame
  maxSpeed: 4.5, // maximum horizontal speed
  jumpForce: -12, // upward velocity applied when jumping (negative = upward)
  friction: 0.78, // horizontal slowdown when no key is pressed (0–1, lower = more friction)

  onGround: false, // tracks whether the player is standing on something
};

// ------------------------------------------------------------
// PHYSICS CONSTANTS
// Defined outside the player object so they can be shared
// across multiple objects (e.g. enemies)
// ------------------------------------------------------------
const GRAVITY = 0.6; // downward force added to vy every frame

// Blob animation time — increases each frame to animate the wobble
let blobT = 0;

// Platform colour stored as an array so it can be reused easily
const PLATFORM_COLOR = [255, 160, 50]; // warm orange

// ============================================================
// setup()
// Runs once at the very start of the sketch.
// Sets up the canvas and positions the player on the ground.
// ============================================================
function setup() {
  createCanvas(800, 450);

  // Place player on top of the ground platform (index 0 in the array)
  player.y = platforms[0].y - player.r;
}

// ============================================================
// draw()
// Runs repeatedly in a loop after setup() finishes.
// Each frame we clear the background, handle input,
// apply physics, resolve collisions, and draw everything.
// ============================================================
function draw() {
  if (bgImage) {
    image(bgImage, 0, 0, width, height);
  } else {
    background(10);
  }

  handleInput();
  applyPhysics();
  resolvePlatformCollisions();

  drawPlatforms();
  drawPlayer();
  drawHUD();

  blobT += 0.015; // advance blob wobble animation each frame
}

// ------------------------------------------------------------
// handleInput()
// Checks which keys are held down this frame and updates
// the player's velocity accordingly.
// keyIsDown() returns true as long as the key is held —
// unlike keyPressed(), which only fires once per press.
// We check both arrow keys and WASD so either works.
// ------------------------------------------------------------
function handleInput() {
  // --- Horizontal movement ---
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    // LEFT or A
    player.vx -= player.speed;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    // RIGHT or D
    player.vx += player.speed;
  }

  // --- Clamp horizontal speed ---
  // constrain(value, min, max) keeps a value within a range.
  // Without this, holding a key forever would accelerate infinitely.
  player.vx = constrain(player.vx, -player.maxSpeed, player.maxSpeed);

  // --- Apply friction when no horizontal key is pressed ---
  // Multiplying by a value less than 1 gradually slows the player down.
  if (
    !keyIsDown(LEFT_ARROW) &&
    !keyIsDown(65) &&
    !keyIsDown(RIGHT_ARROW) &&
    !keyIsDown(68)
  ) {
    player.vx *= player.friction;
  }

  // --- Jump ---
  // The player can only jump when standing on the ground (onGround = true).
  // This prevents jumping again mid-air.
  if ((keyIsDown(UP_ARROW) || keyIsDown(87)) && player.onGround) {
    // UP or W
    player.vy = player.jumpForce;
    player.onGround = false;
  }
}

// ------------------------------------------------------------
// applyPhysics()
// Each frame we:
//   1. Add gravity to vertical velocity (vy)
//   2. Move the player by its velocity (vx, vy)
//   3. Reset onGround so collision can set it again
//   4. Handle falling off the bottom of the canvas
// ------------------------------------------------------------
function applyPhysics() {
  // 1. Apply gravity — pulls the player down every frame
  player.vy += GRAVITY;

  // 2. Move player by its current velocity
  player.x += player.vx;
  player.y += player.vy;

  // 3. Keep player inside canvas horizontally
  player.x = constrain(player.x, player.r, width - player.r);

  // 4. If player falls below the canvas, reset to start position
  if (player.y > height + 100) {
    player.x = 100;
    player.y = platforms[0].y - player.r;
    player.vx = 0;
    player.vy = 0;
  }

  // Assume in the air until collision check says otherwise
  player.onGround = false;
}

// ------------------------------------------------------------
// resolvePlatformCollisions()
// Loops through every platform and checks if the player
// is landing on top of it.
//
// The collision check asks three questions:
//   1. Is the player horizontally overlapping the platform?
//   2. Is the player falling downward (vy >= 0)?
//   3. Is the player's bottom at or below the platform top?
//
// If all three are true, we snap the player to sit on top.
// This top-only check means the player can jump through
// platforms from below, which is a common platformer pattern.
// ------------------------------------------------------------
function resolvePlatformCollisions() {
  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];

    // Player's bounding box edges
    let playerLeft = player.x - player.r;
    let playerRight = player.x + player.r;
    let playerBottom = player.y + player.r;

    // Platform edges
    let platLeft = p.x;
    let platRight = p.x + p.w;
    let platTop = p.y;

    // 1. Check horizontal overlap
    let overlapsHorizontally = playerRight > platLeft && playerLeft < platRight;

    // 2 & 3. Check if landing on top (falling down onto the platform surface)
    // The small tolerance (+ 20) prevents the player clipping through
    // fast-moving platforms or getting stuck on edges.
    let landingOnTop =
      player.vy >= 0 && playerBottom >= platTop && playerBottom <= platTop + 20;

    if (overlapsHorizontally && landingOnTop) {
      if (p.type === "chopstick") {
        if (!p.cracked) {
          p.cracked = true; // chopstick cracks when landed on
        }
        continue; // chopstick does not support the player after cracking
      }

      player.y = platTop - player.r; // snap to platform surface
      player.vy = 0; // stop falling
      player.onGround = true; // allow jumping again
    }
  }
}

// ------------------------------------------------------------
// drawPlatforms()
// Loops through the platforms array and draws each one.
// This is the same loop pattern used to draw any collection
// of objects — enemies, coins, tiles, etc.
// ------------------------------------------------------------
function drawPlatforms() {
  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];

    if (p.type === "sushi") {
      drawSushiPlatform(p);
    } else {
      drawChopstickPlatform(p);
    }
  }
}

function drawSushiPlatform(p) {
  noStroke();

  // rice base
  fill(245, 245, 235);
  rect(p.x, p.y, p.w, p.h, 10);

  // nori band
  fill(35, 40, 35);
  rect(p.x + p.w * 0.15, p.y + p.h * 0.25, p.w * 0.7, p.h * 0.5, 4);

  // topping highlight for sushi roll
  fill(220, 90, 80);
  rect(p.x + p.w * 0.2, p.y + p.h * 0.08, p.w * 0.35, p.h * 0.35, 4);
  fill(245, 180, 80);
  ellipse(p.x + p.w * 0.7, p.y + p.h * 0.25, p.w * 0.18, p.h * 0.4);
}

function drawChopstickPlatform(p) {
  noStroke();
  fill(200, 140, 70);

  let stickY = p.y + p.h * 0.4;
  let thickness = 6;
  rect(p.x, stickY, p.w, thickness, 4);
  rect(p.x, stickY + thickness + 4, p.w, thickness, 4);

  if (p.cracked) {
    stroke(80, 40, 20);
    strokeWeight(3);
    let crackX = p.x + p.w * 0.55;
    let crackY = stickY + thickness / 2;
    line(crackX, crackY, crackX - 10, crackY + 8);
    line(crackX, crackY + 2, crackX + 10, crackY + 12);
    noStroke();
  }
}

// ------------------------------------------------------------
// drawPlayer()
// The player is drawn as a cute onigiri with rice, nori, and a face.
// push() and pop() save and restore drawing settings so
// styles set here don't affect other drawing functions.
// ------------------------------------------------------------
function drawPlayer() {
  push(); // save current drawing settings
  translate(player.x, player.y);

  // Rice body
  noStroke();
  fill(250, 250, 245);
  beginShape();
  vertex(-player.r * 0.85, player.r * 0.75);
  vertex(0, -player.r * 1.1);
  vertex(player.r * 0.85, player.r * 0.75);
  endShape(CLOSE);

  // Rice texture
  fill(235, 235, 225);
  for (let i = -1; i <= 1; i++) {
    ellipse(i * 6, player.r * 0.05, 8, 5);
  }

  // Nori wrap
  fill(30, 40, 35);
  rect(-player.r * 0.5, player.r * 0.25, player.r, player.r * 0.65, 6);

  // Face
  fill(30);
  ellipse(-player.r * 0.3, player.r * 0.1, 8, 8);
  ellipse(player.r * 0.3, player.r * 0.1, 8, 8);

  noFill();
  stroke(30);
  strokeWeight(2);
  arc(0, player.r * 0.35, 18, 12, 0, PI);

  // Blush
  noStroke();
  fill(240, 150, 170, 180);
  ellipse(-player.r * 0.65, player.r * 0.25, 10, 6);
  ellipse(player.r * 0.65, player.r * 0.25, 10, 6);

  pop(); // restore drawing settings
}

// ------------------------------------------------------------
// drawHUD()
// HUD = Heads Up Display.
// Shows controls on screen so the player always knows
// how to interact without needing external instructions.
// ------------------------------------------------------------
function drawHUD() {
  fill(0);
  noStroke();
  textSize(16);
  textAlign(LEFT);
  text(
    "Sushi Go! Jumping on sushi is safe but chopsticks are dangerous... Move: Arrow Keys or WASD   Jump: W or Up Arrow",
    16,
    24,
  );
}
