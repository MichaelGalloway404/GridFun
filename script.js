
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRAVITY = 0.68;
const FRICTION = 0.31;
const GROUND_Y = 500;

let muscleState = "ACTIVE";
let loopTimer = 0;

// --------------------------------------------------
// EXTERNAL SPRITE ATLAS: ragdoll-atlas.png
// 8 columns, each 128 x 192 pixels.
// --------------------------------------------------
const CELL_W = 128;
const CELL_H = 192;
const PART_NAMES = [
    "head", "torso", "upperArm", "forearm",
    "thigh", "calf", "hand", "shoe"
];

const atlas = new Image();
atlas.src = "./ragdoll-atlas.png";

const SPRITES = Object.fromEntries(
    PART_NAMES.map((name, i) => [name, {
        sx: i * CELL_W,
        sy: 0,
        sw: CELL_W,
        sh: CELL_H
    }])
);

// Draw a sprite between two Verlet particles.
// The sprite rotates to follow the bone.
function drawLimb(spriteName, a, b, width) {
    const sprite = SPRITES[spriteName];

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();

    // Move origin to the first joint.
    ctx.translate(a.x, a.y);

    // Source sprites point downward.
    ctx.rotate(angle - Math.PI / 2);

    ctx.drawImage(
        atlas,
        sprite.sx, sprite.sy,
        sprite.sw, sprite.sh,
        -width / 2, 0,
        width, length
    );

    ctx.restore();
}

function drawCenteredSprite(name, p, width, height) {
    const s = SPRITES[name];

    ctx.drawImage(
        atlas,
        s.sx, s.sy, s.sw, s.sh,
        p.x - width / 2,
        p.y - height / 2,
        width,
        height
    );
}

// --------------------------------------------------
// VERLET RAGDOLL
// --------------------------------------------------

class ActiveRagdoll {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.animFrame = 0;

        this.points = [];
        this.bones = [];

        this.addPoint(startX, startY - 80, 10, "head");
        this.addPoint(startX, startY - 55, 3, "neck");
        this.addPoint(startX, startY - 25, 4, "pelvis");

        this.addPoint(startX - 5, startY - 55, 2, "l_shldr");
        this.addPoint(startX + 15, startY - 55, 2, "r_shldr");

        this.addPoint(startX - 20, startY - 35, 2, "l_elbow");
        this.addPoint(startX + 20, startY - 35, 2, "r_elbow");

        this.addPoint(startX - 22, startY - 15, 2, "l_hand");
        this.addPoint(startX + 22, startY - 15, 2, "r_hand");

        this.addPoint(startX - 10, startY - 15, 3, "l_knee");
        this.addPoint(startX + 10, startY - 15, 3, "r_knee");

        this.addPoint(startX - 12, startY + 5, 4, "l_foot");
        this.addPoint(startX + 12, startY + 5, 4, "r_foot");

        this.link(0, 1, 5);
        this.link(1, 2, 35);

        this.link(1, 3, 5);
        this.link(1, 4, 5);

        this.link(3, 5, 20);
        this.link(5, 7, 15);

        this.link(4, 6, 20);
        this.link(6, 8, 15);

        this.link(2, 9, 20);
        this.link(9, 11, 20);

        this.link(2, 10, 20);
        this.link(10, 12, 20);
    }

    addPoint(x, y, radius, label) {
        this.points.push({
            x, y,
            oldX: x,
            oldY: y,
            radius,
            label
        });
    }

    link(a, b, length) {
        this.bones.push({
            pA: this.points[a],
            pB: this.points[b],
            length
        });
    }

    update() {
        loopTimer++;

        if (muscleState === "ACTIVE" && loopTimer > 640) {
            muscleState = "LIMP";
            loopTimer = 0;
        } else if (
            muscleState === "LIMP" &&
            loopTimer > 180
        ) {
            this.resetPosition(244, GROUND_Y - 5);
            muscleState = "ACTIVE";
            loopTimer = 0;
        }

        if (muscleState === "ACTIVE") {
            this.animFrame += 0.09;
            this.x += 0.65;
            this.applyMuscleForces();
        } else {
            this.x = this.points[2].x;
            this.y = this.points[2].y;
        }

        // Verlet integration
        this.points.forEach(p => {
            const vx = (p.x - p.oldX) * FRICTION;
            const vy = (p.y - p.oldY) * FRICTION;

            p.oldX = p.x;
            p.oldY = p.y;

            p.x += vx;
            p.y += vy + GRAVITY;

            if (p.y + p.radius > GROUND_Y) {
                p.y = GROUND_Y - p.radius;
                p.oldX += (p.x - p.oldX) * -0.3;
            }

            if (p.x < p.radius) p.x = p.radius;

            if (p.x > canvas.width - p.radius) {
                p.x = canvas.width - p.radius;
            }
        });

        // Distance constraints
        for (let i = 0; i < 6; i++) {
            this.bones.forEach(b => {
                const dx = b.pB.x - b.pA.x;
                const dy = b.pB.y - b.pA.y;

                const dist = Math.hypot(dx, dy);

                if (dist === 0) return;

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
        const target = [];

        const spineY =
            GROUND_Y - 49 +
            Math.abs(Math.sin(this.animFrame * 2)) * 3;

        const left = Math.sin(this.animFrame);
        const right = Math.sin(this.animFrame + Math.PI);

        target[2] = { x: this.x, y: spineY };
        target[1] = { x: this.x, y: spineY - 30 };
        target[0] = { x: this.x + 2, y: spineY - 55 };

        target[3] = { x: this.x - 12, y: spineY - 30 };
        target[4] = { x: this.x + 12, y: spineY - 30 };

        target[9] = {
            x: this.x - 4 + left * 6,
            y: spineY + 12
        };

        target[11] = {
            x: this.x - 4 + left * 12,
            y: GROUND_Y
        };

        target[10] = {
            x: this.x + 4 + right * 6,
            y: spineY + 12
        };

        target[12] = {
            x: this.x + 4 + right * 12,
            y: GROUND_Y
        };

        target[5] = {
            x: this.x - 8 + right * 6,
            y: spineY - 15
        };

        target[7] = {
            x: this.x - 10 + right * 8,
            y: spineY
        };

        target[6] = {
            x: this.x + 8 + left * 6,
            y: spineY - 15
        };

        target[8] = {
            x: this.x + 10 + left * 8,
            y: spineY
        };

        const strength = 0.08;

        this.points.forEach((p, i) => {
            if (!target[i]) return;

            p.x += (target[i].x - p.x) * strength;
            p.y += (target[i].y - p.y) * strength;
        });
    }

    resetPosition(nx, ny) {
        this.x = nx;
        this.y = ny;
        this.animFrame = 0;

        const positions = [
            [0, -80],
            [0, -55],
            [0, -25],
            [-5, -55],
            [15, -55],
            [-20, -35],
            [20, -35],
            [-22, -15],
            [22, -15],
            [-10, -15],
            [10, -15],
            [-12, 5],
            [12, 5]
        ];

        this.points.forEach((p, i) => {
            p.x = nx + positions[i][0];
            p.y = ny + positions[i][1];

            p.oldX = p.x;
            p.oldY = p.y;
        });
    }

    draw() {
        const p = this.points;

        // Back limbs
        drawLimb("thigh", p[2], p[10], 14);
        drawLimb("calf", p[10], p[12], 11);

        drawLimb("upperArm", p[4], p[6], 10);
        drawLimb("forearm", p[6], p[8], 9);

        // Main torso
        drawLimb("torso", p[1], p[2], 25);

        // Front limbs
        drawLimb("thigh", p[2], p[9], 14);
        drawLimb("calf", p[9], p[11], 11);

        drawLimb("upperArm", p[3], p[5], 10);
        drawLimb("forearm", p[5], p[7], 9);

        // Hands
        drawCenteredSprite("hand", p[7], 9, 10);
        drawCenteredSprite("hand", p[8], 9, 10);

        // Feet
        drawCenteredSprite("shoe", p[11], 18, 10);
        drawCenteredSprite("shoe", p[12], 18, 10);

        // Head rotates with neck-to-head direction
        const headAngle = Math.atan2(
            p[0].y - p[1].y,
            p[0].x - p[1].x
        );

        ctx.save();
        ctx.translate(p[0].x, p[0].y);
        ctx.rotate(headAngle + Math.PI / 2);

        const head = SPRITES.head;

        ctx.drawImage(
            atlas,
            head.sx, head.sy,
            head.sw, head.sh,
            -13, -14, 26, 28
        );

        ctx.restore();

        ctx.fillStyle = "#ffffff99";
        ctx.font = "13px monospace";
        ctx.textAlign = "center";

        ctx.fillText(
            `SYSTEM NERVES STATUS: ${muscleState}`,
            p[2].x,
            Math.max(25, p[0].y - 35)
        );
    }
}

// --------------------------------------------------
// GAME LOOP
// --------------------------------------------------

const character = new ActiveRagdoll(
    244,
    GROUND_Y - 5
);

ctx.imageSmoothingEnabled = false;

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

// Wait for the PNG to load before drawing it.
atlas.onload = () => {
    console.log("Ragdoll sprite atlas loaded:", atlas.naturalWidth, atlas.naturalHeight);
    loop();
};
atlas.onerror = () => {
    console.error("Cannot load ragdoll-atlas.png. Put it beside this JS file / HTML file.");
};
