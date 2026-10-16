const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');
let LEFT, RIGHT, UP, DOWN;
let boxes = [];
let grid = {};
let squareSize = 2;
for (let i = 0; i < canvas.clientWidth / squareSize; i++) {
	for (let j = 0; j < canvas.clientHeight / squareSize; j++) {
		grid[(i * squareSize).toString() + '-' + (j * squareSize).toString()] = 't';
	}
}
// console.log(grid);
for (let i = 0; i < canvas.clientWidth *30; i += squareSize) {
	let box = {
		x: 300,
		y: squareSize,
		w: squareSize,
		h: squareSize,
		color: `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`
	};
	boxes.push(box);
}
// // Handle key strokes 
// canvas.addEventListener('keydown', function(e) {
// 	if (e.keyCode === 37) LEFT = true;
// 	if (e.keyCode === 38) UP = true;
// 	if (e.keyCode === 39) RIGHT = true;
// 	if (e.keyCode === 40) DOWN = true;
// });
// canvas.addEventListener('keyup', function(e) {
// 	if (e.keyCode === 37) LEFT = false;
// 	if (e.keyCode === 38) UP = false;
// 	if (e.keyCode === 39) RIGHT = false;
// 	if (e.keyCode === 40) DOWN = false;
// });
function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
// --- ADDED FOR TIMING CONTROL ---
let lastTime = 0;
const fps = 30; // Change this number to adjust speed (frames per second)
const interval = 1000 / fps; // Milliseconds between frames
let inc = 0;
let choice = [0, squareSize, squareSize];
let choices = [0, squareSize, squareSize, -squareSize, -squareSize];
//let choice = [0, squareSize, squareSize*2];
//let choices = [0, squareSize, squareSize*2, -squareSize, -squareSize*2];

function runAnimation(timestamp) {
	requestAnimationFrame(runAnimation);
	// Calculate how much time passed since the last render
	const deltaTime = timestamp - lastTime;
	// Only draw if enough time has passed
	if (deltaTime >= interval) {
		// Adjust lastTime, accounting for any leftover milliseconds
		lastTime = timestamp - (deltaTime % interval);
		//inc++;
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
		/*for (let i = 0; i < 12*5; i++) {
			let ran = randInt(0,254);
			for (let j = 0; j < 12*5; j++) {
				ctx.beginPath(); 
				ctx.rect(i * 10, j * 10, 50, 50);
				ctx.strokeStyle = "black";
				//ctx.fillStyle = `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`; 
				//ctx.fillStyle = `rgb(${(inc*ran%255)}, ${(inc*ran%255)},${(inc*ran%255)})`; 
ctx.fillStyle = `rgb(${randInt(0,(inc*ran%255))}, ${randInt(0,(inc*ran%255))}, ${randInt(0,(inc*ran%255))})`;
				ctx.fill();
				ctx.stroke(); 
				if (inc >= 255){inc = 0;}
			}
		}*/
		for (let i = 0; i < boxes.length; i++) {
			ctx.beginPath();
			ctx.rect(boxes[i].x, boxes[i].y, boxes[i].w, boxes[i].h);
			// init first boxes spot to taken
			grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 'f';
			ctx.strokeStyle = 'black';
			//ctx.fillStyle = `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`; 
			//ctx.fillStyle = `rgb(${(inc*ran%255)}, ${(inc*ran%255)},${(inc*ran%255)})`; 
			// boxes[i].color = `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`;
			ctx.fillStyle = boxes[i].color;
			ctx.fill();
			ctx.stroke();
			// console.log(boxes[0].x);
			randHorizontal = randInt(0, 2);
			// console.log(grid[boxes[i].x.toString()+"-"+boxes[i].y.toString()]);
			if (boxes[i].y < canvas.clientHeight - squareSize) {
				//boxes[i].y += randInt(1, 10);
				if (grid[boxes[i].x.toString() + "-" + (boxes[i].y + choice[randHorizontal]).toString()] != 'f') {
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 't'
					boxes[i].y += choice[randHorizontal];
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 'f'
				}
			}
			if (boxes[i].y >= canvas.clientHeight - squareSize) {
				if (grid[boxes[i].x.toString() + "-" + (0).toString()] = 'f') {
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 't'
					boxes[i].y = 0;
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 'f'
				}
			}
			//if (randHorizontal == 0) boxes[i].x -= randInt(1, 10);
			//if (randHorizontal == 1) boxes[i].x += randInt(1, 10);
			let newX = choices[randInt(0, 4)]
			if (grid[(boxes[i].x + newX).toString() + "-" + boxes[i].y.toString()] != 'f') {
				grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 't'
				boxes[i].x += newX;
				grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 'f'
			}
			if (boxes[i].x < 0) {
				if (grid[(squareSize).toString() + "-" + boxes[i].y.toString()] != 'f') {
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 't'
					boxes[i].x = squareSize;
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 'f'
				}
			}
			if (boxes[i].x > canvas.clientWidth - squareSize) {
				if (grid[(canvas.clientWidth - squareSize).toString() + "-" + boxes[i].y.toString()] != 'f') {
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 't'
					boxes[i].x = canvas.clientWidth - squareSize;
					grid[boxes[i].x.toString() + "-" + boxes[i].y.toString()] = 'f'
				}
			}
		}
	}
}
requestAnimationFrame(runAnimation);
