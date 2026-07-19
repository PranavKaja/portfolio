// --- 1. TEXT WRAPPING SETUP ---
function wrapText() {
    // The per-character scatter is a desktop-pointer-only easter egg. On touch
    // devices the car game can't run at all, so exploding every heading and
    // paragraph into single-character spans would only bloat the DOM and break
    // screen-reader reading order for zero benefit, skip wrapping entirely.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    // skip text inside the hover popovers: they're invisible while the
    // game runs, so wrapping them only bloats the DOM (it roughly
    // doubles the span count) and creates unhittable collision targets
    const textElements = document.querySelectorAll('h1, h2, p');
    textElements.forEach(el => {
        if (el.closest('.pp-expand')) return;
        // capture the readable text before it's shredded into per-char spans
        const accessibleText = el.innerText;
        const processNode = (node) => {
            if (node.nodeType === 3) {
                const text = node.nodeValue;
                if (!text.trim()) return node;
                const fragment = document.createDocumentFragment();
                const words = text.split(/(\s+)/);
                words.forEach(word => {
                    if (word.trim() === '') {
                        fragment.appendChild(document.createTextNode(word));
                    } else {
                        const wordSpan = document.createElement('span');
                        wordSpan.className = 'word-wrap';
                        for (let i = 0; i < word.length; i++) {
                            const charSpan = document.createElement('span');
                            charSpan.className = 'char-wrap';
                            charSpan.textContent = word[i];
                            wordSpan.appendChild(charSpan);
                        }
                        fragment.appendChild(wordSpan);
                    }
                });
                return fragment;
            } else if (node.nodeType === 1) {
                if (['BR', 'SPAN', 'STRONG'].includes(node.tagName)) {
                    Array.from(node.childNodes).forEach(child => {
                        const newChild = processNode(child);
                        if (newChild !== child) node.replaceChild(newChild, child);
                    });
                }
                return node;
            }
            return node;
        };
        Array.from(el.childNodes).forEach(child => {
            const newChild = processNode(child);
            if (newChild !== child && newChild.nodeType) el.replaceChild(newChild, child);
        });
        // Hide the decorative char spans from assistive tech and expose the real
        // text once, so screen readers announce words, not "P R A G M A T I C".
        Array.from(el.children).forEach(c => c.setAttribute('aria-hidden', 'true'));
        const srText = document.createElement('span');
        srText.className = 'sr-only';
        srText.textContent = accessibleText;
        el.appendChild(srText);
    });
}
// NOTE: wrapText() is intentionally NOT called at load. It shreds every heading
// and paragraph into per-character spans that each carry will-change:transform, // thousands of layer-promoted nodes that drag the whole page even when nobody
// plays the game. It's now deferred to ensureWrapped(), called the first time the
// car actually spawns (see startGame). Everyday visitors pay nothing.

// --- 2. AUDIO SYNTHESIS ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol * 0.4, audioCtx.currentTime); // Reduced global volume to 40%
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// --- 3. CANVAS EFFECTS ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let matrixDrops = [];
let matrixUnlocked = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function spawnSparks(x, y) {
    for(let i=0; i<15; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1.0,
            color: Math.random() > 0.5 ? '#ff4500' : '#ffff00'
        });
    }
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (matrixUnlocked) {
        ctx.fillStyle = '#00ff41';
        ctx.font = '15px monospace';
        for (let i = 0; i < matrixDrops.length; i++) {
            // Draw a short tail for each drop so it doesn't require filling the screen with black
            for (let j = 0; j < 15; j++) {
                let tailY = matrixDrops[i] - j;
                if (tailY < 0) continue;
                ctx.globalAlpha = 1 - (j / 15);
                const text = String.fromCharCode(Math.floor(Math.random() * 128));
                ctx.fillText(text, i * 20, tailY * 20);
            }
            if (matrixDrops[i] * 20 > canvas.height && Math.random() > 0.975) matrixDrops[i] = 0;
            matrixDrops[i]++;
        }
        ctx.globalAlpha = 1.0;
    }
    
    for (let i = skidmarks.length - 1; i >= 0; i--) {
        let s = skidmarks[i];
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI*2);
        ctx.fill();
        s.life -= 0.007; // Fade out rapidly over ~2 seconds
        if (s.life <= 0) skidmarks.splice(i, 1);
    }
    ctx.globalAlpha = 1.0;

    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 3, 3);
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.05;
        if(p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1.0;
}

// --- 4. GAME VARIABLES ---
let gameActive = false;
let lastInteractionTime = Date.now();
let closingTimeout = null;
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
let joystickActive = false;

const car = {
    x: window.innerWidth / 2, y: window.innerHeight / 2,
    angle: 0, visualAngle: 0, velocity: 0,
    baseMaxSpeed: 8, maxSpeed: 8,
    acceleration: 0.3, friction: 0.95, turnSpeed: 0.032,
    hp: 5, brokenDown: false, boost: 100,
    element: document.getElementById('player-car')
};

const checkpoint = { x: 0, y: 0, element: document.getElementById('checkpoint'), type: 'time' };
let score = 0;
let timeLeft = 10;
let bestScore = localStorage.getItem('cargame_best') || 0;
document.getElementById('best-score').innerText = bestScore;

let lastFrameTime = performance.now();
let resetTimeout = null;
const uiOverlay = document.getElementById('game-ui');
const timeEl = document.getElementById('time-left');
const scoreEl = document.getElementById('score');
const healthBar = document.getElementById('health-bar');

function updateHealthUI() {
    const boxes = document.querySelectorAll('.hp-box');
    let color = '#00ea3d';
    if (car.hp <= 2) color = '#ff4500';
    else if (car.hp <= 3) color = '#e3b341';
    
    boxes.forEach((box, index) => {
        if (index < car.hp) {
            box.style.background = color;
            box.style.opacity = '1';
        } else {
            box.style.background = 'rgba(255,255,255,0.1)';
            box.style.opacity = '0.5';
        }
    });
}

function updateBoostUI() {
    const bar = document.getElementById('boost-bar');
    if (bar) {
        bar.style.width = `${car.boost}%`;
    }
}

let charElements = [];
let textWrapped = false;
// Build the char spans lazily, only when the game first runs, and capture
// each char's starting position once at that point.
function ensureWrapped() {
    if (textWrapped) return;
    textWrapped = true;
    wrapText();
    charElements = Array.from(document.querySelectorAll('.char-wrap'))
        .map(el => ({ element: el, rect: el.getBoundingClientRect(), scattered: false, currX: 0, currY: 0, currRot: 0 }));
}
function updateCharRects() {
    if (!gameActive) return;   // skip the per-scroll forced reflow unless a game is actually running
    charElements.forEach(char => { if (!char.scattered) char.rect = char.element.getBoundingClientRect(); });
}
window.addEventListener('resize', updateCharRects);
window.addEventListener('scroll', updateCharRects, { passive: true });

// --- 5. INPUT HANDLING ---
window.addEventListener('contextmenu', (e) => {
    if (gameActive) e.preventDefault();
});

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (e.key === 'Escape') {
        if (gameActive) { endGame(); return; }
        if (gameStarting) { cancelCountdown(); return; }   // bail out mid-countdown too
    }
    if (['w', 'a', 's', 'd'].includes(key)) {
        keys[key] = true;
        const keyEl = document.querySelector(`.keycap[data-text="${key.toUpperCase()}"]`);
        if (keyEl) keyEl.classList.add('pressed');
        const hintEl = document.getElementById('wasd-hint');
        if (!gameActive) {
            // tic-tac-toe has its own stage: don't boot the car under it
            if (document.body.classList.contains('ttt-active')) return;
            // WASD straight from the briefing or an open file is intent
            // to play: dismiss the popups instead of racing behind them
            const alertOv = document.getElementById('sys-alert-overlay');
            if (alertOv && alertOv.classList.contains('active')) alertOv.classList.remove('active');
            if (document.body.classList.contains('msn-open')) {
                const dsrBack = document.getElementById('dsr-back');
                const msnBack = document.getElementById('msn-back');
                if (document.getElementById('dsr-overlay').classList.contains('active') && dsrBack) dsrBack.click();
                if (document.getElementById('msn-overlay').classList.contains('active') && msnBack) msnBack.click();
            }
            if (hintEl) {
                hintEl.classList.add('first-trigger');
                hintEl.classList.remove('triggered');
                setTimeout(() => {
                    if ((gameActive || gameStarting) && hintEl.classList.contains('first-trigger')) {
                        hintEl.classList.remove('first-trigger');
                        hintEl.classList.add('triggered');
                    }
                }, 800);
            }
            if (!gameStarting) startGame();
        } else {
            if (hintEl && !hintEl.classList.contains('first-trigger')) {
                hintEl.classList.add('triggered');
            }
        }
        
        lastInteractionTime = Date.now();
        if (resetTimeout) clearTimeout(resetTimeout);
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') keys.shift = true;
    if (e.code === 'Space') {
        keys.space = true;
        if (gameActive) e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) {
        keys[key] = false;
        const keyEl = document.querySelector(`.keycap[data-text="${key.toUpperCase()}"]`);
        if (keyEl) keyEl.classList.remove('pressed');
        lastInteractionTime = Date.now();
        startInactivityTimer();
    }
    if (e.code === 'Space') {
        keys.space = false;
        if (gameActive) {
            car.angle = car.visualAngle;
        }
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') keys.shift = false;
});

window.addEventListener('blur', () => {
    Object.keys(keys).forEach(k => keys[k] = false);
    document.querySelectorAll('.keycap.pressed').forEach(el => el.classList.remove('pressed'));
    startInactivityTimer();
});

function startInactivityTimer() {
    if (resetTimeout) clearTimeout(resetTimeout);
    if (!keys.w && !keys.a && !keys.s && !keys.d && !joystickActive) {
        resetTimeout = setTimeout(() => {
            if (gameActive) endGame();
            resetScatteredText();
        }, 5000);
    }
}


// --- 6. GAME LOGIC ---
let gameStarting = false;
let countdownInterval = null;

function startGame() {
    if (window.innerWidth <= 768) return;
    if (gameStarting) return;

    gameStarting = true;
    score = 0; timeLeft = 12;
    
    const baseScale = window.innerWidth / 1920;
    car.scaleFactor = Math.max(0.5, Math.min(baseScale, 1.5));
    car.baseMaxSpeed = 8 * car.scaleFactor;
    car.acceleration = 0.3 * car.scaleFactor;

    car.x = window.innerWidth / 2; car.y = window.innerHeight / 2;
    car.velocity = 0; car.angle = 0; car.visualAngle = 0; car.hp = 5;
    car.brokenDown = false; car.maxSpeed = car.baseMaxSpeed; car.boost = 100;
    updateBoostUI();
    
    if (closingTimeout) {
        clearTimeout(closingTimeout);
        closingTimeout = null;
    }
    
    const carBody = car.element.querySelector('.car-body');
    if(carBody) { 
        carBody.classList.remove('game-closing');
        carBody.style.transform = 'scale(1, 1)'; 
        carBody.style.filter = 'none'; 
    }
    canvas.classList.remove('game-closing');
    uiOverlay.classList.remove('game-closing');
    checkpoint.element.classList.remove('game-closing');

    car.element.classList.remove('hidden'); uiOverlay.classList.remove('hidden');
    checkpoint.element.classList.remove('hidden'); canvas.classList.remove('hidden');
    
    // Resume audio context if needed
    if(audioCtx.state === 'suspended') audioCtx.resume();

    // Toggle game-active class for cursor
    document.body.classList.add('game-active');
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    skidmarks = [];

    // Trigger game-active to hide cursor
    document.body.classList.add('game-active');

    // Show countdown
    const countdownOverlay = document.getElementById('game-countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const pauseBtn = document.getElementById('countdown-pause-btn');
    countdownOverlay.classList.remove('hidden');

    // Build the char spans the scatter effect needs WHILE the countdown is on
    // screen, deferred two frames so the "3" paints first and the heavy wrap
    // (thousands of spans + their layout reads) is hidden behind it instead of
    // freezing the keypress. It finishes long before "GO!", so play starts smooth.
    requestAnimationFrame(() => requestAnimationFrame(ensureWrapped));
    
    let count = 3;
    let isPaused = false;
    
    countdownText.innerText = count;
    playTone(400, 'sine', 0.2, 0.3);
    
    if (pauseBtn) {
        pauseBtn.innerText = 'PAUSE TIMER';
        pauseBtn.onclick = () => {
            isPaused = !isPaused;
            if (isPaused) {
                clearInterval(countdownInterval);
                pauseBtn.innerText = 'RESUME TIMER';
                countdownText.innerText = 'PAUSED';
            } else {
                pauseBtn.innerText = 'PAUSE TIMER';
                countdownText.innerText = count;
                startCountdown();
            }
        };
    }
    
    function startCountdown() {
        countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.innerText = count;
                playTone(400, 'sine', 0.2, 0.3);
            } else if (count === 0) {
                countdownText.innerText = "GO!";
                if (pauseBtn) pauseBtn.style.display = 'none';
                playTone(800, 'square', 0.4, 0.4);
            } else {
                clearInterval(countdownInterval);
                countdownInterval = null;
                countdownOverlay.classList.add('hidden');
                if (pauseBtn) pauseBtn.style.display = 'inline-block';
                finishStartGame();
            }
        }, 1000);
    }
    
    startCountdown();
}

function finishStartGame() {
    gameStarting = false;
    gameActive = true; 
    
    // Resume audio context if needed
    if(audioCtx.state === 'suspended') audioCtx.resume();

    updateHealthUI();
    updateScore(); spawnCheckpoint(); updateCharRects();
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// ESC during the 3-2-1 countdown bails out cleanly: the run never started, so
// just tear the staged game down (no score logged, no closing animation).
function cancelCountdown() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    gameStarting = false;
    const overlay = document.getElementById('game-countdown-overlay');
    if (overlay) overlay.classList.add('hidden');
    const pauseBtn = document.getElementById('countdown-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'inline-block'; pauseBtn.innerText = 'PAUSE TIMER'; }
    car.element.classList.add('hidden');
    uiOverlay.classList.add('hidden');
    checkpoint.element.classList.add('hidden');
    canvas.classList.add('hidden');
    document.body.classList.remove('game-active');
    const hintEl = document.getElementById('wasd-hint');
    if (hintEl) { hintEl.classList.remove('triggered'); hintEl.classList.remove('first-trigger'); }
    startInactivityTimer();
}

function spawnCheckpoint() {
    checkpoint.x = 50 + Math.random() * (window.innerWidth - 100);
    checkpoint.y = 100 + Math.random() * (window.innerHeight - 150);
    checkpoint.element.style.left = `${checkpoint.x}px`;
    checkpoint.element.style.top = `${checkpoint.y}px`;
    const rand = Math.random();
    const svgClock = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 16"></polyline></svg>`;
    const svgLightning = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    const svgWrench = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;

    if (rand < 0.80) { checkpoint.type = 'time'; checkpoint.element.innerHTML = svgClock; }
    else if (rand < 0.95) { checkpoint.type = 'overdrive'; checkpoint.element.innerHTML = svgLightning; }
    else { checkpoint.type = 'repair'; checkpoint.element.innerHTML = svgWrench; }
    checkpoint.element.className = '';
    checkpoint.element.classList.add(`type-${checkpoint.type}`);
}

function updateScore() {
    scoreEl.innerText = score;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('cargame_best', bestScore);
        document.getElementById('best-score').innerText = bestScore;
    }
    if (score >= 10 && !matrixUnlocked) {
        matrixUnlocked = true;
        document.body.classList.add('matrix-mode');
        for(let x = 0; x < canvas.width/20; x++) matrixDrops[x] = 1;
        playTone(150, 'sawtooth', 1.5, 0.3); // Matrix unlock sound
    }
}

function gameLoop(now) {
    if (!gameActive) return;
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    const safeDt = Math.min(dt, 0.1);
    const timeScale = safeDt * 60; // 1.0 at 60fps

    renderCanvas();

    if (!car.brokenDown) {
        // Give slightly more acceleration when drifting so you can power through corners
        if (keys.w) car.velocity += (keys.space ? car.acceleration * 1.5 : car.acceleration) * timeScale;
        if (keys.s) car.velocity -= car.acceleration * timeScale;
    }

    let currentFriction = keys.space ? 0.91 : 0.95;
    let speedFactor = Math.min(1, Math.abs(car.velocity) / car.maxSpeed);
    let baseTurnSpeed = 0.02 + (1 - speedFactor) * 0.05;

    let currentMaxSpeed = car.maxSpeed;
    if (keys.shift && car.boost > 0 && !car.brokenDown) {
        car.boost -= dt * 33; // Depletes in ~3 seconds
        currentMaxSpeed = 14 * (car.scaleFactor || 1);
        car.velocity += car.acceleration * 1.5 * timeScale;
        if (Math.random() < 0.3 * timeScale) spawnSparks(car.x, car.y); // visual effect
    } else {
        car.boost += dt * 10; // Refills in 10 seconds
    }
    car.boost = Math.max(0, Math.min(100, car.boost));
    updateBoostUI();

    car.velocity *= Math.pow(currentFriction, timeScale);

    if (car.velocity > currentMaxSpeed) car.velocity -= car.acceleration * timeScale;
    if (car.velocity < -currentMaxSpeed/2) car.velocity += car.acceleration * timeScale;

    if (Math.abs(car.velocity) > 0.1) {
        const dir = car.velocity > 0 ? 1 : -1;
        if (keys.space) {
            // Drift mode: visual angle changes much faster, real angle changes slightly
            if (keys.a) { car.visualAngle -= 0.1 * dir * timeScale; car.angle -= 0.02 * dir * timeScale; }
            if (keys.d) { car.visualAngle += 0.1 * dir * timeScale; car.angle += 0.02 * dir * timeScale; }
        } else {
            // Normal mode
            if (keys.a) car.angle -= baseTurnSpeed * dir * timeScale;
            if (keys.d) car.angle += baseTurnSpeed * dir * timeScale;
            
            // Snap visual angle back towards movement angle
            let diff = car.angle - car.visualAngle;
            while(diff > Math.PI) diff -= Math.PI*2;
            while(diff < -Math.PI) diff += Math.PI*2;
            car.visualAngle += diff * 0.15 * timeScale; 
        }
    } else {
        car.visualAngle = car.angle;
    }

    car.x += Math.sin(car.angle) * car.velocity * timeScale;
    car.y -= Math.cos(car.angle) * car.velocity * timeScale;

    // Skid marks
    if (keys.space && Math.abs(car.velocity) > 3) {
        skidmarks.push({
            x: car.x - Math.sin(car.visualAngle)*15,
            y: car.y + Math.cos(car.visualAngle)*15,
            color: matrixUnlocked ? '#00ff41' : '#000000',
            life: 0.35
        });
        if (skidmarks.length > 500) skidmarks.shift();
    }

    let hitEdge = false;
    let impactVelocity = Math.abs(car.velocity);
    if (car.x < 15) { car.x = 15; car.velocity *= -0.5; hitEdge = true; }
    if (car.x > window.innerWidth - 15) { car.x = window.innerWidth - 15; car.velocity *= -0.5; hitEdge = true; }
    if (car.y < 80) { car.y = 80; car.velocity *= -0.5; hitEdge = true; }
    if (car.y > window.innerHeight - 25) { car.y = window.innerHeight - 25; car.velocity *= -0.5; hitEdge = true; }

    if (hitEdge && impactVelocity > 2) {
        playTone(100 + Math.random()*50, 'square', 0.1, 0.3); // Crash sound
        spawnSparks(car.x, car.y);
        
        // Only take damage if not in overdrive (maxSpeed <= baseMaxSpeed)
        if (car.maxSpeed <= car.baseMaxSpeed) {
            car.hp -= 1;
            updateHealthUI();
            
            if (car.hp <= 0) {
                car.brokenDown = true; car.velocity = 0; car.maxSpeed = 0;
                const carBody = car.element.querySelector('.car-body');
                if (carBody) { carBody.style.transform = `scale(0.8, 0.6)`; carBody.style.filter = `brightness(0.2) grayscale(1)`; }
                playTone(50, 'sawtooth', 0.5, 0.4);
                setTimeout(() => { if (gameActive) endGame(); }, 1500);
            } else {
                car.maxSpeed = Math.max(2, car.baseMaxSpeed - ((5 - car.hp) * 1.5));
                const carBody = car.element.querySelector('.car-body');
                if (carBody) {
                    const damageRatio = (5 - car.hp) / 5;
                    const squish = Math.max(0.6, 1 - (damageRatio * 0.4)); 
                    const squishX = Math.max(0.8, 1 - (damageRatio * 0.2));
                    carBody.style.transform = `scale(${squishX}, ${squish})`;
                    carBody.style.filter = `brightness(${1 - (damageRatio*0.3)}) grayscale(${damageRatio})`;
                }
            }
        }
    }

    car.element.style.left = `${car.x}px`;
    car.element.style.top = `${car.y}px`;
    car.element.style.transform = `translate(-50%, -50%) rotate(${car.visualAngle}rad)`;

    const dx = car.x - checkpoint.x;
    const dy = car.y - checkpoint.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 35) {
        // past score 35 the clock tightens: every pickup pays less time
        const lateGame = score >= 35;
        if (checkpoint.type === 'time') {
            timeLeft += lateGame ? 2 : 2.5;
            playTone(600, 'sine', 0.1, 0.3);
        } else if (checkpoint.type === 'repair') {
            if (car.hp < 5) car.hp += 1;
            car.maxSpeed = Math.max(2, car.baseMaxSpeed - ((5 - car.hp) * 1.5));
            updateHealthUI();
            const carBody = car.element.querySelector('.car-body');
            if (carBody) {
                const damageRatio = (5 - car.hp) / 5;
                const squish = Math.max(0.6, 1 - (damageRatio * 0.4)); 
                const squishX = Math.max(0.8, 1 - (damageRatio * 0.2));
                carBody.style.transform = `scale(${squishX}, ${squish})`;
                carBody.style.filter = `brightness(${1 - (damageRatio*0.3)}) grayscale(${damageRatio})`;
            }
            playTone(400, 'triangle', 0.2, 0.3);
            timeLeft += lateGame ? 2.5 : 3;
        } else if (checkpoint.type === 'overdrive') {
            car.maxSpeed = 15;
            car.velocity = 15; // Instant boost
            timeLeft += lateGame ? 2.5 : 3;
            document.body.classList.add('overdrive-active');
            setTimeout(() => {
                if(!car.brokenDown) car.maxSpeed = car.baseMaxSpeed - ((5 - car.hp)*1.5);
                document.body.classList.remove('overdrive-active');
            }, 5000);
            playTone(800, 'square', 0.3, 0.3);
        }
        score++; updateScore(); spawnCheckpoint();
    }

    timeLeft -= dt;
    timeEl.innerText = Math.max(0, timeLeft).toFixed(1);
    if (timeLeft <= 0) endGame();

    checkTextCollisions();
    if (gameActive) requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;

    // Visitor Intel: log the finished run's score (anonymous)
    if (window.intel) window.intel.track('game_score', { score: score });

    // Add closing animation class
    const carBody = car.element.querySelector('.car-body');
    if (carBody) carBody.classList.add('game-closing');
    canvas.classList.add('game-closing');
    uiOverlay.classList.add('game-closing');
    checkpoint.element.classList.add('game-closing');

    closingTimeout = setTimeout(() => {
        car.element.classList.add('hidden');
        uiOverlay.classList.add('hidden');
        checkpoint.element.classList.add('hidden');
        canvas.classList.add('hidden');
        
        // Clear canvas when game ends so skidmarks don't persist forever
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        skidmarks = [];
        closingTimeout = null;

        if (score > 15) {
            setTimeout(() => {
                const sysAlertOverlay = document.getElementById('sys-alert-overlay');
                // the game briefing reuses this overlay and changes the title
                document.getElementById('sys-alert-title').innerText = 'SYSTEM ALERT';
                document.getElementById('sys-alert-msg').innerText = "Nice driving! For the record, Pranav's highest score is 1012.";
                sysAlertOverlay.classList.add('active');
                
                document.getElementById('sys-alert-btn').onclick = () => {
                    sysAlertOverlay.classList.remove('active');
                };
            }, 100);
        }
    }, 500);
    
    // Remove game-active class for cursor and WASD hint triggered state
    document.body.classList.remove('game-active');
    const hintEl = document.getElementById('wasd-hint');
    if (hintEl) {
        hintEl.classList.remove('triggered');
        hintEl.classList.remove('first-trigger');
    }
    
    if (matrixUnlocked) {
        matrixUnlocked = false;
        document.body.classList.remove('matrix-mode');
    }
    startInactivityTimer();
    setTimeout(resetScatteredText, 500);
}

function checkTextCollisions() {
    if (Math.abs(car.velocity) < 1) return;
    const carRadius = 25;
    charElements.forEach(char => {
        if (!char.rect) return;
        const rectCenterX = char.rect.left + char.rect.width / 2 + (char.scattered ? char.currX : 0);
        const rectCenterY = char.rect.top + char.rect.height / 2 + (char.scattered ? char.currY : 0);
        const dx = car.x - rectCenterX; const dy = car.y - rectCenterY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < carRadius + 15) {
            if (!char.scattered) { 
                char.scattered = true; 
                char.element.classList.add('scattered'); 
                char.currX = 0; char.currY = 0; char.currRot = 0;
            }
            const angle = Math.atan2(dy, dx);
            const speedFactor = Math.max(1, Math.abs(car.velocity) / car.baseMaxSpeed);
            const pushForce = (Math.abs(car.velocity) * 2 * speedFactor) + 5;
            
            char.currX += -Math.cos(angle) * pushForce + (Math.random() - 0.5) * 10;
            char.currY += -Math.sin(angle) * pushForce + (Math.random() - 0.5) * 10;
            char.currRot += (Math.random() - 0.5) * (30 * speedFactor);
            
            char.element.style.transform = `translate3d(${char.currX}px, ${char.currY}px, 0px) rotate(${char.currRot}deg)`;
        }
    });
}

function resetScatteredText() {
    charElements.forEach(char => {
        if (char.scattered) {
            char.scattered = false; char.element.classList.remove('scattered');
            char.currX = 0; char.currY = 0; char.currRot = 0;
            char.element.style.transform = '';
        }
    });
}
