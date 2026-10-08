const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');
let LEFT, RIGHT, UP, DOWN;
// 	handle key strokes 
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

function runAnimation(timestamp) {
	ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
	for (let i = 0; i < 12*5; i++) {
		for (let j = 0; j < 12*5; j++) {
			ctx.beginPath(); //needed for fill
			// ctx.moveTo(0, 0);
			// ctx.lineTo(canvas.clientWidth, canvas.clientHeight);
			// ctx.lineWidth = 4;
			// ctx.strokeRect(10,10,50,50); // only for skeleton
			ctx.rect(i * 10, j * 10, 50, 50);
			ctx.strokeStyle = "black";
			// ctx.strokeStyle = "rgb(0, 255, 0)"; // Green
			ctx.fillStyle = `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`; // Red
			ctx.fill();
			ctx.stroke(); //needed for fill
		}
	}
	requestAnimationFrame(runAnimation);
}
requestAnimationFrame(runAnimation);
