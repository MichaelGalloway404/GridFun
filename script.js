 const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');
let LEFT, RIGHT, UP, DOWN;
let boxes= [];
for(let i = 0;i<200;i++){
	let box ={
	x:randInt(0,canvas.clientWidth-10),
	y:0,
	w:5,
	h:5,
	color:`rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`
};

boxes.push(box); 
	}

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
const fps = 30; // Change this number to adjust speed (frames per second)
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
  //inc++;
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
		inc = randInt(0,2);
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
for(let i = 0;i<boxes.length;i++){
    ctx.beginPath(); 
				ctx.rect(boxes[i].x,boxes[i].y,boxes[i].w,boxes[i].h);
				ctx.strokeStyle = "black";
				//ctx.fillStyle = `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`; 
				//ctx.fillStyle = `rgb(${(inc*ran%255)}, ${(inc*ran%255)},${(inc*ran%255)})`; 
				ctx.fillStyle = boxes[i].color;
				ctx.fill();
				ctx.stroke(); 
				if(boxes[i].y < canvas.clientHeight - 10) boxes[i].y += randInt(1,10);
				if(boxes[i].y >= canvas.clientHeight - 15){boxes[i].y=0;}
				if(inc == 0 && boxes[i].x > 0 && boxes[i].x < canvas.clientWidth -10 ) boxes[i].x -= randInt(1,10);
				if(inc == 1 && boxes[i].x > 0 && boxes[i].x < canvas.clientWidth -10 ) boxes[i].x += randInt(1,10);
				}
	}
}
requestAnimationFrame(runAnimation);
