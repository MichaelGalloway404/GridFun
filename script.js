const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Physics Configurations ---
const GRAVITY = 0.3;
const FRICTION = 0.98;
const GROUND_Y = 500;

// --- State Machine ---
// States: "WALKING", "STANDING", "RAGDOLL"
let currentState = "WALKING";
let stateTimer = 0; 

// --- Jointed Character Structure ---
class StickFigure {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.color = "#ffffff";
        this.points = [];
        this.constraints = [];
        this.animationFrame = 0;

        // Create Physics Nodes (Verlet Particles)
        // [x, y, oldX, oldY, radius, label]
        this.addPoint(startX, startY - 80, 10, "head");      // 0
        this.addPoint(startX, startY - 55, 0, "neck");       // 1
        this.addPoint(startX, startY - 30, 0, "pelvis");     // 2
        this.addPoint(startX - 15, startY - 55, 0, "l_shldr"); // 3
        this.addPoint(startX + 15, startY - 55, 0, "r_shldr"); // 4
        this.addPoint(startX - 20, startY - 35, 0, "l_elbow"); // 5
        this.addPoint(startX + 20, startY - 35, 0, "r_elbow"); // 6
        this.addPoint(startX - 22, startY - 15, 0, "l_hand");  // 7
        this.addPoint(startX + 22, startY - 15, 0, "r_hand");  // 8
        this.addPoint(startX - 12, startY - 15, 0, "l_knee");  // 9
        this.addPoint(startX + 12, startY - 15, 0, "r_knee");  // 10
        this.addPoint(startX - 15, startY + 5, 4, "l_foot");   // 11
        this.addPoint(startX + 15, startY + 5, 4, "r_foot");   // 12

        // Build structural skeleton bones
        this.link(0, 1, 25);  // Head to Neck
        this.link(1, 2, 35);  // Spine (Neck to Pelvis)
        this.link(1, 3, 15);  // Collarbone Left
        this.link(1, 4, 15);  // Collarbone Right
        this.link(3, 5, 20);  // Left Upper Arm
        this.link(5, 7, 20);  // Left Forearm
        this.link(4, 6, 20);  // Right Upper Arm
        this.link(6, 8, 20);  // Right Forearm
        this.link(2, 9, 25);  // Left Thigh
        this.link(9, 11, 25); // Left Calf
        this.link(2, 10, 25); // Right Thigh
        this.link(10, 12, 25);// Right Calf
    }

    addPoint(x, y, r, label) {
        this.points.push({ x, y, oldX: x, oldY: y, radius: r, label, isStatic: false });
    }

    link(indexA, indexB, customLength) {
        const pA = this.points[indexA];
        const pB = this.points[indexB];
        this.constraints.push({ pA, pB, length: customLength });
    }

    update() {
        stateTimer++;

        // State Transitions based on time ticks
        if (currentState === "WALKING" && stateTimer > 180) { // Walk for 3 seconds
            currentState = "STANDING";
            stateTimer = 0;
        } else if (currentState === "STANDING" && stateTimer > 120) { // Stand still for 2 seconds
            currentState = "RAGDOLL";
            stateTimer = 0;
            // Give a slight forward dynamic nudge when collapsing
            this.points.forEach(p => p.oldX -= 1.5);
        }

        if (currentState === "WALKING" || currentState === "STANDING") {
            this.animateKinematic();
        } else {
            this.simulateRagdollPhysics();
        }
    }

    // Procedural Animation System (Driven by Math when alive)
    animateKinematic() {
        if (currentState === "WALKING") {
            this.x += 1.5; // Translate body root position forward
            this.animationFrame += 0.07;
        } else {
            // Calm down animation toward zero stance cycles
            this.animationFrame += (0 - this.animationFrame) * 0.1;
        }

        // Keep root core pinned to global movement positions
        const spineY = GROUND_Y - 30;
        const pts = this.points;

        pts[2].x = this.x; // Pelvis base reference
        pts[2].y = spineY + Math.abs(Math.sin(this.animationFrame * 2)) * 3; // Bobbing height accentuation
        pts[1].x = this.x; // Neck line target
        pts[1].y = pts[2].y - 35;
        pts[0].x = this.x; // Head tracking placement
        pts[0].y = pts[1].y - 25;

        pts[3].x = this.x - 12; pts[3].y = pts[1].y + 2; // Shoulders anchors
        pts[4].x = this.x + 12; pts[4].y = pts[1].y + 2;

        // Angular math calculations tracking strides
        const leftStride = Math.sin(this.animationFrame);
        const rightStride = Math.sin(this.animationFrame + Math.PI);

        // Legs Procedural Keyframing Math
        pts[9].x = this.x - 5 + leftStride * 8;   pts[9].y = pts[2].y + 20;  // L Knee
        pts[11].x = this.x - 5 + leftStride * 14; pts[11].y = GROUND_Y;      // L Foot
        pts[10].x = this.x + 5 + rightStride * 8;  pts[10].y = pts[2].y + 20; // R Knee
        pts[12].x = this.x + 5 + rightStride * 14; pts[12].y = GROUND_Y;     // R Foot

        // Arms matching counter swings
        pts[5].x = this.x - 10 + rightStride * 6; pts[5].y = pts[3].y + 15; // L Elbow
        pts[7].x = this.x - 12 + rightStride * 8; pts[7].y = pts[5].y + 15; // L Hand
        pts[6].x = this.x + 10 + leftStride * 6;  pts[6].y = pts[4].y + 15; // R Elbow
        pts[8].x = this.x + 12 + leftStride * 8;  pts[8].y = pts[6].y + 15; // R Hand

        // Synchronize old positional points tracking values to zero out velocity builds before physics switch
        this.points.forEach(p => {
            p.oldX = p.x;
            p.oldY = p.y;
        });
    }

    // Fully Autonomous Particle Integration Engine (Driven by physics when dead)
    simulateRagdollPhysics() {
        // 1. Particle Velocity Integrator Updates
        this.points.forEach(p => {
            const vx = (p.x - p.oldX) * FRICTION;
            const vy = (p.y - p.oldY) * FRICTION;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy + GRAVITY;

            // Environmental Collisions (Floor plane clamping limits)
            if (p.y + p.radius > GROUND_Y) {
                p.y = GROUND_Y - p.radius;
                p.oldX += (p.x - p.oldX) * -0.4; // Ground Friction damping slide variables
            }
            // Screen boundaries loop configurations
            if (p.x < p.radius) p.x = p.radius;
            if (p.x > canvas.width - p.radius) p.x = canvas.width - p.radius;
        });

        // 2. Solve Muscle/Bone Link Distance Constraints (Enforces strict rigid links)
        for (let i = 0; i < 5; i++) {
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
    }

    draw() {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

        // Draw structural bone constraints
        this.constraints.forEach(c => {
            ctx.beginPath();
            ctx.moveTo(c.pA.x, c.pA.y);
            ctx.lineTo(c.pB.x, c.pB.y);
            ctx.stroke();
        });

        // Explicitly render standard circular head cap
        const head = this.points[0];
        ctx.beginPath();
        ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // Render Current Status State Tag Text Information Above Unit
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`STATE: ${currentState}`, this.points[1].x, Math.min(this.points[0].y - 30, GROUND_Y - 110));
    }
}

// Instantiate actor starting on left side of viewport
let testSubject = new StickFigure(100, GROUND_Y);

// --- User Interaction Trigger (Tap / Click to manually force Ragdoll reset) ---
window.addEventListener("pointerdown", () => {
    // Reset structural simulation loops back to active start
    currentState = "WALKING";
    stateTimer = 0;
    testSubject = new StickFigure(100, GROUND_Y);
});

// --- Core Update / Render Loop ---
function loop() {
    // Solid background paint pass
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor platform divider geometry line
    ctx.strokeStyle = "#27272c";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Loop logic execution structures
    testSubject.update();
    testSubject.draw();

    // Auto-loop instructions tracking resets 
    if (currentState === "RAGDOLL" && stateTimer > 200) {
        currentState = "WALKING";
        stateTimer = 0;
        testSubject = new StickFigure(100, GROUND_Y);
    }

    requestAnimationFrame(loop);
}

loop();
