const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');
let LEFT, RIGHT, UP, DOWN;

// Handle key strokes 
canvas.addEventListener('keydown', function(e) {
	if (e.keyCode === 37) LEFT = true;
	if (e.keyCode === 38) UP = true;
	if (e.keyCode === 39) RIGHT = true;
	if (e.keyCode === 40) DOWN = true;
});
canvas.addEventListener('keyup', function(e) {
	if (e.keyCode === 37) LEFT = false;
	if (e.keyCode === 38) UP = false;
	if (e.keyCode === 39) RIGHT = false;
	if (e.keyCode === 40) DOWN = false;
});

function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- ADDED FOR TIMING CONTROL ---
let lastTime = 0;
const fps = 5; // Change this number to adjust speed (frames per second)
const interval = 1000 / fps; // Milliseconds between frames
let inc = 0;

function runAnimation(timestamp) {
	requestAnimationFrame(runAnimation);

	// Calculate how much time passed since the last render
	const deltaTime = timestamp - lastTime;
	
	
	// Only draw if enough time has passed
	if (deltaTime >= interval) {
		// Adjust lastTime, accounting for any leftover milliseconds
		lastTime = timestamp - (deltaTime % interval);

		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
		for (let i = 0; i < 12*5; i++) {
			for (let j = 0; j < 12*5; j++) {
				inc++;
				
				ctx.beginPath(); 
				ctx.rect(i * 10, j * 10, 50, 50);
				ctx.strokeStyle = "black";
				//ctx.fillStyle = `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`; 
				ctx.fillStyle = `rgb(${randInt(0,1)}, ${randInt(0,1)}, ${inc})`; 
				ctx.fill();
				ctx.stroke(); 
				
			}
		}if (inc >= 255){inc = 0;}
	}
}
requestAnimationFrame(runAnimation);
