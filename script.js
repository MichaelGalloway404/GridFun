 const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Physics Configurations ---
const GRAVITY = 0.28;
const FRICTION = 0.98;
const GROUND_Y = 500;

// --- State Engine ---
// "ACTIVE": Muscles are firing to maintain posture and walk.
// "LIMP": Muscles completely shut off (pure limp ragdoll collapse).
let muscleState = "ACTIVE";
let loopTimer = 0;

class ActiveRagdoll {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.animFrame = 0;
        
        this.points = [];
        this.bones = [];

        // 1. Create Physical Verlet Particles (The Mass points)
        // [x, y, oldX, oldY, radius, label]
        this.addPoint(startX, startY - 80, 10, "head");      // 0
        this.addPoint(startX, startY - 55, 3,  "neck");      // 1
        this.addPoint(startX, startY - 25, 4,  "pelvis");    // 2
        this.addPoint(startX - 15, startY - 55, 2, "l_shldr"); // 3
        this.addPoint(startX + 15, startY - 55, 2, "r_shldr"); // 4
        this.addPoint(startX - 20, startY - 35, 2, "l_elbow"); // 5
        this.addPoint(startX + 20, startY - 35, 2, "r_elbow"); // 6
        this.addPoint(startX - 22, startY - 15, 2, "l_hand");  // 7
        this.addPoint(startX + 22, startY - 15, 2, "r_hand");  // 8
        this.addPoint(startX - 10, startY - 15, 3, "l_knee");  // 9
        this.addPoint(startX + 10, startY - 15, 3, "r_knee");  // 10
        this.addPoint(startX - 12, startY + 5,  4, "l_foot");  // 11
        this.addPoint(startX + 12, startY + 5,  4, "r_foot");  // 12

        // 2. Structural Rigid Distances (Skeletal Constraints)
        this.link(0, 1, 25);  // Head to Neck
        this.link(1, 2, 30);  // Spine (Neck to Pelvis)
        this.link(1, 3, 15);  // Left Collar
        this.link(1, 4, 15);  // Right Collar
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
        this.points.push({ x, y, oldX: x, oldY: y, radius: r, label });
    }

    link(indexA, indexB, length) {
        this.bones.push({ pA: this.points[indexA], pB: this.points[indexB], length });
    }

        update() {
        loopTimer++;

        // State Loop Controller
        if (muscleState === "ACTIVE" && loopTimer > 240) { 
            muscleState = "LIMP";
            loopTimer = 0;
        } else if (muscleState === "LIMP" && loopTimer > 180) { 
            this.resetPosition(100, GROUND_Y);
            muscleState = "ACTIVE";
            loopTimer = 0;
        }

        // --- PHASE 1: Apply Muscles (ONLY If Active) ---
        if (muscleState === "ACTIVE") {
            this.animFrame += 0.06;
            this.x += 1.2; // Move reference system forward only while alive
            this.applyMuscleForces();
        } else {
            // Keep the invisible reference system anchor glued directly to the 
            // physical falling pelvis particle so it doesn't build phantom spring force
            this.x = this.points[2].x; 
            this.y = this.points[2].y;
        }

        // --- PHASE 2: Standard Verlet Integration Engine ---
        this.points.forEach(p => {
            const vx = (p.x - p.oldX) * FRICTION;
            const vy = (p.y - p.oldY) * FRICTION;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy + GRAVITY;

            // Fluid Platform Ground Interaction
            if (p.y + p.radius > GROUND_Y) {
                p.y = GROUND_Y - p.radius;
                p.oldX += (p.x - p.oldX) * -0.3; // Friction drag simulation
            }
        });

        // --- PHASE 3: Solve Bone Structural Lengths ---
        for (let i = 0; i < 6; i++) {
            this.bones.forEach(b => {
                const dx = b.pB.x - b.pA.x;
                const dy = b.pB.y - b.pA.y;
                const dist = Math.hypot(dx, dy);
                if (dist === 0) return; // Prevent divide-by-zero glitches
                const diff = b.length - dist;
                const percent = (diff / dist) / 2;
                const offsetX = dx * percent;
                const offsetY = dy * percent;

                b.pA.x -= offsetX;
                b.pA.y -= offsetY;
                b.pB.x += offsetX;
                b.pB.y += offsetY;
            });
        }
    }


    // This mimics Euphoria's internal muscle contractions.
    // It compares physical joint coordinates with ideal math targets, 
    // and gently pulls the physical nodes into position.
    applyMuscleForces() {
        const pts = this.points;
        const targetPos = [];
        
        // Define an ideal "procedural" kinematic target framework
        const spineY = GROUND_Y - 32 + Math.abs(Math.sin(this.animFrame * 2)) * 3;
        const leftStride = Math.sin(this.animFrame);
        const rightStride = Math.sin(this.animFrame + Math.PI);

        // Core Balance Keepers (Head & Torso targets)
        targetPos[2] = { x: this.x, y: spineY };                    // Pelvis
        targetPos[1] = { x: this.x, y: spineY - 30 };               // Neck
        targetPos[0] = { x: this.x + 2, y: spineY - 55 };           // Head (leaning slightly forward)
        targetPos[3] = { x: this.x - 12, y: spineY - 30 };          // L Shoulder
        targetPos[4] = { x: this.x + 12, y: spineY - 30 };          // R Shoulder

        // Walking Leg Targets
        targetPos[9]  = { x: this.x - 4 + leftStride * 6,   y: spineY + 12 };  // L Knee
        targetPos[11] = { x: this.x - 4 + leftStride * 12,  y: GROUND_Y };     // L Foot
        targetPos[10] = { x: this.x + 4 + rightStride * 6,  y: spineY + 12 };  // R Knee
        targetPos[12] = { x: this.x + 4 + rightStride * 12, y: GROUND_Y };     // R Foot

        // Arm swing targets
        targetPos[5] = { x: this.x - 8 + rightStride * 6, y: spineY - 15 };   // L Elbow
        targetPos[7] = { x: this.x - 10 + rightStride * 8, y: spineY };       // L Hand
        targetPos[6] = { x: this.x + 8 + leftStride * 6, y: spineY - 15 };    // R Elbow
        targetPos[8] = { x: this.x + 10 + leftStride * 8, y: spineY };        // R Hand

        // Apply contractive spring forces (Muscle Strength factor)
        // Lower values mean looser muscles (more Euphoria style drunk/heavy weight swaying).
        const muscleStrength = 0.09; 

        this.points.forEach((p, idx) => {
            if (targetPos[idx]) {
                const target = targetPos[idx];
                // Pull position forward slightly toward animation target frames
                p.x += (target.x - p.x) * muscleStrength;
                p.y += (target.y - p.y) * muscleStrength;
            }
        });
    }

    resetPosition(nx, ny) {
        this.x = nx;
        this.y = ny;
        this.points.forEach(p => {
            p.x = nx;
            p.y = ny - 40;
            p.oldX = p.x;
            p.oldY = p.y;
        });
    }

    draw() {
        ctx.strokeStyle = muscleState === "ACTIVE" ? "#4caf50" : "#f44336";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

        // Draw Skeleton Link Paths
        this.bones.forEach(b => {
            ctx.beginPath();
            ctx.moveTo(b.pA.x, b.pA.y);
            ctx.lineTo(b.pB.x, b.pB.y);
            ctx.stroke();
        });

        // Draw Head Node
        const head = this.points[0];
        ctx.beginPath();
        ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
        ctx.fillStyle = muscleState === "ACTIVE" ? "#81c784" : "#e57373";
        ctx.fill();
        ctx.stroke();

        // Render UI HUD information
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`NERVOUS SYSTEM FLUIDITY: ${muscleState}`, this.points[2].x, GROUND_Y - 130);
    }
}

// Instantiate Simulation Object
const character = new ActiveRagdoll(100, GROUND_Y);

function loop() {
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor Line Geometry rendering
    ctx.strokeStyle = "#27272c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    character.update();
    character.draw();

    requestAnimationFrame(loop);
}
loop();
