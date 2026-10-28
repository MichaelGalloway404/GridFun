const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Physics Configurations ---
const GRAVITY = 0.68;
const FRICTION = 0.31;
const GROUND_Y = 500;

// --- State Engine ---
let muscleState = "ACTIVE"; // "ACTIVE" or "LIMP"
let loopTimer = 0;

class ActiveRagdoll {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.animFrame = 0;
        
        this.points = [];
        this.bones = [];

        // 1. Create Physical Verlet Particles
        // [x, y, oldX, oldY, radius, label]
        this.addPoint(startX, startY - 80, 10, "head");      // 0
        this.addPoint(startX, startY - 55, 3,  "neck");      // 1
        this.addPoint(startX, startY - 25, 40,  "pelvis");    // 2
        this.addPoint(startX - 5, startY - 55, 2, "l_shldr"); // 3
        this.addPoint(startX + 15, startY - 55, 2, "r_shldr"); // 4
        this.addPoint(startX - 20, startY - 35, 2, "l_elbow"); // 5
        this.addPoint(startX + 20, startY - 35, 2, "r_elbow"); // 6
        this.addPoint(startX - 22, startY - 15, 2, "l_hand");  // 7
        this.addPoint(startX + 22, startY - 15, 2, "r_hand");  // 8
        this.addPoint(startX - 10, startY - 15, 3, "l_knee");  // 9
        this.addPoint(startX + 10, startY - 15, 3, "r_knee");  // 10
        this.addPoint(startX - 12, startY + 5,  4, "l_foot");  // 11
        this.addPoint(startX + 12, startY + 5,  4, "r_foot");  // 12

        // 2. Structural Lengths (Rigid Skeletal Constraints)
        this.link(0, 1, 25);  // Head to Neck
        this.link(1, 2, 35);  // Spine
        this.link(1, 3, 5);  // Left Collar
        this.link(1, 4, 5);  // Right Collar
        this.link(3, 5, 20);  // Left Upper Arm
        this.link(5, 7, 15);  // Left Forearm
        this.link(4, 6, 20);  // Right Upper Arm
        this.link(6, 8, 15);  // Right Forearm
        this.link(2, 9, 20);  // Left Thigh
        this.link(9, 11, 20); // Left Calf
        this.link(2, 10, 20); // Right Thigh
        this.link(10, 12, 20);// Right Calf
    }

    addPoint(x, y, r, label) {
        this.points.push({ x, y, oldX: x, oldY: y, radius: r, label });
    }

    link(indexA, indexB, length) {
        this.bones.push({ pA: this.points[indexA], pB: this.points[indexB], length });
    }

    update() {
        loopTimer++;

        // State Loop Handler
        if (muscleState === "ACTIVE" && loopTimer > 640) { 
            muscleState = "LIMP";
            loopTimer = 0;
        } else if (muscleState === "LIMP" && loopTimer > 180) { 
            this.resetPosition(244, 540);
            muscleState = "ACTIVE";
            loopTimer = 0;
        }

        // --- PHASE 1: Apply Muscle Forces (STRICTLY IF ALIVE) ---
        if (muscleState === "ACTIVE") {
            this.animFrame += 0.09;
            this.x += .65; // Constant move forward speed
            this.applyMuscleForces();
        } else {
            // Keep anchor systems locked directly to physics values
            this.x = this.points[2].x;
            this.y = this.points[2].y;
        }

        // --- PHASE 2: Verlet Integration Vector Engine ---
        this.points.forEach(p => {
            const vx = (p.x - p.oldX) * FRICTION;
            const vy = (p.y - p.oldY) * FRICTION;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy + GRAVITY;

            // Strict Platform Floor Collision Guard
            if (p.y + p.radius > GROUND_Y) {
                p.y = GROUND_Y - p.radius;
                p.oldX += (p.x - p.oldX) * -0.3; // Dampen horizontal skidding
            }
            
            // Screen Box Boundary Clamps
            if (p.x < p.radius) p.x = p.radius;
            if (p.x > canvas.width - p.radius) p.x = canvas.width - p.radius;
        });

        // --- PHASE 3: Iterative Constraint Stiffness Solver ---
        for (let i = 0; i < 6; i++) {
            this.bones.forEach(b => {
                const dx = b.pB.x - b.pA.x;
                const dy = b.pB.y - b.pA.y;
                const dist = Math.hypot(dx, dy);
                if (dist === 0) return; // Prevent divide by zero calculation errors
                
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

    applyMuscleForces() {
        const pts = this.points;
        const targetPos = [];
        
        const spineY = GROUND_Y - 49 + Math.abs(Math.sin(this.animFrame * 2)) * 3;
        const leftStride = Math.sin(this.animFrame);
        const rightStride = Math.sin(this.animFrame + Math.PI);

        // Map ideal walking coordinates
        targetPos[2] = { x: this.x, y: spineY };                    // Pelvis
        targetPos[1] = { x: this.x, y: spineY - 30 };               // Neck
        targetPos[0] = { x: this.x + 2, y: spineY - 55 };           // Head
        targetPos[3] = { x: this.x - 12, y: spineY - 30 };          // L Shoulder
        targetPos[4] = { x: this.x + 12, y: spineY - 30 };          // R Shoulder
        targetPos[9] = { x: this.x - 4 + leftStride * 6,   y: spineY + 12 };  // L Knee
        targetPos[11] = { x: this.x - 4 + leftStride * 12,  y: GROUND_Y };     // L Foot
        targetPos[10] = { x: this.x + 4 + rightStride * 6,  y: spineY + 12 };  // R Knee
        targetPos[12] = { x: this.x + 4 + rightStride * 12, y: GROUND_Y };     // R Foot
        targetPos[5] = { x: this.x - 8 + rightStride * 6, y: spineY - 15 };   // L Elbow
        targetPos[7] = { x: this.x - 10 + rightStride * 8, y: spineY };       // L Hand
        targetPos[6] = { x: this.x + 8 + leftStride * 6, y: spineY - 15 };    // R Elbow
        targetPos[8] = { x: this.x + 10 + leftStride * 8, y: spineY };        // R Hand

        const muscleStrength = 0.08; 

        this.points.forEach((p, idx) => {
            if (targetPos[idx]) {
                const target = targetPos[idx];
                p.x += (target.x - p.x) * muscleStrength;
                p.y += (target.y - p.y) * muscleStrength;
            }
        });
    }

    // resetPosition(nx, ny) {
    //     this.x = nx;
    //     this.y = ny;
    //     this.points.forEach((p, idx) => {
    //         p.x = nx;
    //         p.y = ny - 40;
    //         p.oldX = p.x;
    //         p.oldY = p.y;
    //     });
    // }
	resetPosition(nx, ny) {
    this.x = nx;
    this.y = ny;
    this.animFrame = 0;

    const positions = [
        [0, -80],    // 0 Head
        [0, -55],    // 1 Neck
        [0, -25],    // 2 Pelvis
        [-5, -55],   // 3 Left Shoulder
        [15, -55],   // 4 Right Shoulder
        [-20, -35],  // 5 Left Elbow
        [20, -35],   // 6 Right Elbow
        [-22, -15],  // 7 Left Hand
        [22, -15],   // 8 Right Hand
        [-10, -15],  // 9 Left Knee
        [10, -15],   // 10 Right Knee
        [-12, 5],    // 11 Left Foot
        [12, 5]      // 12 Right Foot
    ];

    this.points.forEach((p, idx) => {
        p.x = nx + positions[idx][0];
        p.y = ny + positions[idx][1];

        // Reset Verlet velocity
        p.oldX = p.x;
        p.oldY = p.y;
    });
}

    draw() {
        ctx.strokeStyle = muscleState === "ACTIVE" ? "#4caf50" : "#f44336";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";

        this.bones.forEach(b => {
            ctx.beginPath();
            ctx.moveTo(b.pA.x, b.pA.y);
            ctx.lineTo(b.pB.x, b.pB.y);
            ctx.stroke();
        });

        const head = this.points[0];
        ctx.beginPath();
        ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
        ctx.fillStyle = muscleState === "ACTIVE" ? "#81c784" : "#e57373";
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`SYSTEM NERVES STATUS: ${muscleState}`, this.points[2].x, Math.max(40, this.points[0].y - 30));
    }
}

const character = new ActiveRagdoll(244, 540);

function loop() {
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
