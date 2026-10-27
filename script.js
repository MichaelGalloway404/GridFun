
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Physics Configurations ---
const GRAVITY = 0.3;
const FRICTION = 0.98;
const GROUND_Y = 550;

// --- Map Layout (Static Platforms) ---
const platforms = [
    { x: 0, y: GROUND_Y, width: 800, height: 50 }, // Floor
    { x: 100, y: 420, width: 200, height: 15 },
    { x: 500, y: 420, width: 200, height: 15 },
    { x: 300, y: 300, width: 200, height: 15 },
    { x: 150, y: 180, width: 120, height: 15 },
    { x: 530, y: 180, width: 120, height: 15 }
];

// --- Global Entity Containers ---
let projectiles = [];
let ragdolls = [];

// --- Ragdoll Physics Class ---
// Created dynamically via Verlet integration when a bot loses its health
class Ragdoll {
    constructor(x, y, color) {
        this.points = [];
        this.constraints = [];
        this.color = color;
        this.alpha = 1.0;

        // Create skeletal vertex nodes [x, y, oldX, oldY, radius, label]
        // Base structure centered around the head, torso, and limbs
        this.addPoint(x, y - 25, 6, "head");      // 0: Head
        this.addPoint(x, y - 10, 4, "chest");     // 1: Chest
        this.addPoint(x, y + 10, 4, "pelvis");    // 2: Pelvis
        this.addPoint(x - 15, y - 10, 3, "l_hand"); // 3: Left Hand
        this.addPoint(x + 15, y - 10, 3, "r_hand"); // 4: Right Hand
        this.addPoint(x - 12, y + 30, 3, "l_foot"); // 5: Left Foot
        this.addPoint(x + 12, y + 30, 3, "r_foot"); // 6: Right Foot

        // Give them a small explosive upward / sideways pop when dying
        const blastX = (Math.random() - 0.5) * 6;
        const blastY = -3 - Math.random() * 4;
        this.points.forEach(p => {
            p.oldX -= blastX;
            p.oldY -= blastY;
        });

        // Link joints together using concrete spring distances
        this.link(0, 1); // Head to Chest
        this.link(1, 2); // Chest to Pelvis
        this.link(1, 3); // Chest to Left Hand
        this.link(1, 4); // Chest to Right Hand
        this.link(2, 5); // Pelvis to Left Foot
        this.link(2, 6); // Pelvis to Right Foot
        this.link(3, 4); // Hand cross brace to prevent folding
    }

    addPoint(x, y, r, label) {
        this.points.push({ x, y, oldX: x, oldY: y, radius: r, label });
    }

    link(indexA, indexB) {
        const pA = this.points[indexA];
        const pB = this.points[indexB];
        const dist = Math.hypot(pA.x - pB.x, pA.y - pB.y);
        this.constraints.push({ pA, pB, length: dist });
    }

    update() {
        // 1. Verlet Particle Movement
        this.points.forEach(p => {
            const vx = (p.x - p.oldX) * FRICTION;
            const vy = (p.y - p.oldY) * FRICTION;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy + GRAVITY; // Apply gravity to skeletal nodes

            // Platform and floor tracking collisions for ragdoll limbs
            platforms.forEach(plat => {
                if (p.x > plat.x && p.x < plat.x + plat.width) {
                    if (p.oldY <= plat.y && p.y + p.radius >= plat.y) {
                        p.y = plat.y - p.radius;
                        p.oldY = p.y + vy * 0.2; // Friction on impact bounce
                    }
                }
            });

            // Boundary checks
            if (p.x < p.radius) p.x = p.radius;
            if (p.x > canvas.width - p.radius) p.x = canvas.width - p.radius;
        });

        // 2. Solve Rigidity Constraints (Multiple passes to tighten skeleton joints)
        for (let i = 0; i < 4; i++) {
            this.constraints.forEach(c => {
                const dx = c.pB.x - c.pA.x;
                const dy = c.pB.y - c.pA.y;
                const dist = Math.hypot(dx, dy);
                const diff = c.length - dist;
                const percent = (diff / dist) / 2;
                const offsetX = dx * percent;
                const offsetY = dy * percent;

                c.pA.x -= offsetX;
                c.pA.y -= offsetY;
                c.pB.x += offsetX;
                c.pB.y += offsetY;
            });
        }

        // Slowly fade away dead ragdoll corpses
        this.alpha -= 0.003;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

        // Draw structural bone linkages
        this.constraints.forEach(c => {
            ctx.beginPath();
            ctx.moveTo(c.pA.x, c.pA.y);
            ctx.lineTo(c.pB.x, c.pB.y);
            ctx.stroke();
        });

        // Draw separate head node circle explicitly
        const head = this.points[0];
        ctx.beginPath();
        ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// --- Autonomous Fighting AI Class ---
class FighterBot {
    constructor(x, y, color, name, targetSide) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 24;
        this.height = 40;
        this.color = color;
        this.name = name;
        this.health = 100;
        this.isGrounded = false;

        // Artificial Decisions Timers
        this.shootCooldown = 0;
        this.aiDecisionTimer = 0;
        this.moveDirection = targetSide === "left" ? -1 : 1;
    }

    update(enemy) {
        // Apply Gravity
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Basic Platform Physics Engine
        this.isGrounded = false;
        platforms.forEach(plat => {
            if (this.x + this.width / 2 > plat.x && this.x - this.width / 2 < plat.x + plat.width) {
                // Falling through platform top surface edge thresholds
                if (this.vy >= 0 && this.y + this.height >= plat.y && this.y + this.height - this.vy <= plat.y + 8) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                }
            }
        });

        // Boundaries configuration
        if (this.x - this.width / 2 < 0) { this.x = this.width / 2; this.moveDirection = 1; }
        if (this.x + this.width / 2 > canvas.width) { this.x = canvas.width - this.width / 2; this.moveDirection = -1; }

        // --- AI Behavior Decision Brain Logic ---
        this.aiDecisionTimer--;
        if (this.aiDecisionTimer <= 0) {
            this.aiDecisionTimer = 30 + Math.random() * 40; // Rethink every ~1 second

            // Hunt enemy direction tracking
            if (Math.random() > 0.3) {
                this.moveDirection = this.x < enemy.x ? 1 : -1;
            }

            // Jump decision if enemy is above or stuck behind an obstacles
            if (this.isGrounded && (enemy.y < this.y - 60 || Math.random() < 0.15)) {
                this.vy = -7.5; 
            }
        }

        // Apply movement tracking acceleration
        this.vx = this.moveDirection * 2.2;

        // --- Targeting & Shooting System Logic ---
        if (this.shootCooldown > 0) this.shootCooldown--;

        // Fire ray check if it has operational sightlines
        if (this.shootCooldown === 0 && Math.random() < 0.08) {
            const centerX = this.x;
            const centerY = this.y + this.height / 2;
            const targetX = enemy.x;
            const targetY = enemy.y + enemy.height / 2;

            // Calculate angle vector heading directly to enemy location
            const angle = Math.atan2(targetY - centerY, targetX - centerX);
            
            projectiles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * 9,
                vy: Math.sin(angle) * 9 - 0.5, // Subtle upward compensation arc
                radius: 4,
                owner: this
            });

            this.shootCooldown = 25; // Attack speed fire rate window limits
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) this.health = 0;
    }

    draw() {
        const xOffset = this.x - this.width / 2;
        
        // Draw Bot Hull body core capsule
        ctx.fillStyle = this.color;
        ctx.fillRect(xOffset, this.y, this.width, this.height);

        // Visual Head Helmet visor plate
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(xOffset + (this.moveDirection === 1 ? 14 : 2), this.y + 6, 8, 6);

        // Simple Health Bar render above name display frames
        ctx.fillStyle = "#444444";
        ctx.fillRect(this.x - 20, this.y - 14, 40, 5);
        ctx.fillStyle = this.health > 30 ? "#4caf50" : "#f44336";
        ctx.fillRect(this.x - 20, this.y - 14, (this.health / 100) * 40, 5);
    }
}

// --- Spawn Active Combat Teams ---
let bot1 = new FighterBot(100, 200, "#2196f3", "Alpha Bot", "right");
let bot2 = new FighterBot(700, 200, "#ff5722", "Omega Bot", "left");

function resetFighter(deadBot) {
    if (deadBot.name === "Alpha Bot") {
        bot1 = new FighterBot(50 + Math.random() * 200, 100, "#2196f3", "Alpha Bot", "right");
    } else {
        bot2 = new FighterBot(550 + Math.random() * 200, 100, "#ff5722", "Omega Bot", "left");
    }
}

// --- Main Engine Simulation Game Loop ---
function loop() {
    // Background Space Refresh Clearing Clear Screen
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Map Architecture Structures
    ctx.fillStyle = "#27272c";
    platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
    });

    // Run active bot system if alive, run checking intersections
    if (bot1.health > 0) bot1.update(bot2);
    if (bot2.health > 0) bot2.update(bot1);

    // Render Bot Assets
    if (bot1.health > 0) bot1.draw();
    if (bot2.health > 0) bot2.draw();

    // Process & Track Active Bullet Objects
