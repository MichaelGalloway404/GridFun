// Assumes your HTML has: <canvas id="gameCanvas" width="800" height="600"></canvas>
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Game Configurations ---
const GRAVITY = 0.15;
const BOUNCE = 0.8; // Bounciness off pegs and walls

// --- Game Objects State ---
let ball = null; // null means ready to shoot
const canon = {
    x: canvas.width / 2,
    y: 40,
    angle: Math.PI / 2, // Points straight down initially
    length: 50
};

let pegs = [];

// --- Initialize Peg Grid ---
function initPegs() {
    pegs = [];
    const rows = 6;
    const cols = 9;
    const spacingX = 70;
    const spacingY = 60;
    const startX = (canvas.width - (cols - 1) * spacingX) / 2;
    const startY = 180;

    for (let r = 0; r < rows; r++) {
        // Offset alternate rows for a staggered Peggle layout
        const offsetX = (r % 2 === 0) ? 0 : spacingX / 2;
        for (let c = 0; c < (r % 2 === 0 ? cols : cols - 1); c++) {
            pegs.push({
                x: startX + c * spacingX + offsetX,
                y: startY + r * spacingY,
                radius: 10,
                isHit: false,
                color: Math.random() > 0.2 ? "#ff5722" : "#2196f3" // Orange (normal) vs Blue (special)
            });
        }
    }
}

// --- Input Handling (Universal Pointer Events) ---
// Pointer events automatically combine mouse, touch screens, and trackpads/styluses seamlessly.
function handlePointer(e) {
    const rect = canvas.getBoundingClientRect();
    // Support proper scaling if CSS sizes the canvas differently than its internal resolution
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);

    const pointerX = ((clientX - rect.left) / rect.width) * canvas.width;
    const pointerY = ((clientY - rect.top) / rect.height) * canvas.height;

    // Aim the cannon toward the pointer position
    canon.angle = Math.atan2(pointerY - canon.y, pointerX - canon.x);
}

// Fire the ball on tap/click release
function launchBall() {
    if (ball !== null) return; // Prevent multiple balls on screen

    ball = {
        x: canon.x + Math.cos(canon.angle) * canon.length,
        y: canon.y + Math.sin(canon.angle) * canon.length,
        vx: Math.cos(canon.angle) * 7, // Fire velocity
        vy: Math.sin(canon.angle) * 7,
        radius: 8
    };
}

// Attach listeners for touch, mouse, and trackpads safely combined
canvas.addEventListener("pointerdown", (e) => {
    handlePointer(e);
    launchBall();
});

canvas.addEventListener("pointermove", (e) => {
    handlePointer(e);
});

// Avoid standard browser pull-to-refresh / scrolling when interacting with the game canvas on mobile
canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });


// --- Physics & Updates ---
function update() {
    if (ball) {
        // Apply Physics
        ball.vy += GRAVITY;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall Collisions (Left / Right)
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx = -ball.vx * BOUNCE;
        } else if (ball.x + ball.radius > canvas.width) {
            ball.x = canvas.width - ball.radius;
            ball.vx = -ball.vx * BOUNCE;
        }

        // Ceiling Collision
        if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.vy = -ball.vy * BOUNCE;
        }

        // Peg Collisions
        pegs.forEach(peg => {
            const dx = ball.x - peg.x;
            const dy = ball.y - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ball.radius + peg.radius) {
                peg.isHit = true;

                // Elastic collision response vector
                const nx = dx / distance;
                const ny = dy / distance;

                // Push ball out of overlapping peg zone
                ball.x = peg.x + nx * (ball.radius + peg.radius);
                ball.y = peg.y + ny * (ball.radius + peg.radius);

                // Reflect velocity across normal vector
                const dotProduct = ball.vx * nx + ball.vy * ny;
                ball.vx = (ball.vx - 2 * dotProduct * nx) * BOUNCE;
                ball.vy = (ball.vy - 2 * dotProduct * ny) * BOUNCE;
            }
        });

        // Out of Bounds / Bottom Reset (Clears lit pegs)
        if (ball.y - ball.radius > canvas.height) {
            ball = null;
            pegs = pegs.filter(peg => !peg.isHit); // Remove hit pegs
            if (pegs.length === 0) initPegs();    // Respawn grid if board is wiped
        }
    }
}

// --- Render Engine ---
function draw() {
    // Clear screen
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Pegs
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        // Dim the peg if hit, otherwise use original color
        ctx.fillStyle = peg.isHit ? "#444444" : peg.color;
        ctx.fill();
        ctx.closePath();
    });

    // Draw Cannon
    ctx.save();
    ctx.translate(canon.x, canon.y);
    ctx.rotate(canon.angle);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, -10, canon.length, 20); // Draws cannon barrel
    ctx.restore();

    // Draw Ball
    if (ball) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.closePath();
    }
}

// --- Main Loop ---
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start Game
initPegs();
loop();
