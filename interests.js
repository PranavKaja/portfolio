const svgs = {
    car: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 32 24"><path d="M2 14l-1-1 1-1 3-.5q1.5-1.5 3-.5h4L16 8h5q4.5 0 7 3q1 0 1.5-.5v2.5q0 2-2 2a2.5 2.5 0 0 0-5 0H10a2.5 2.5 0 0 0-5 0z"/><path d="M13 11.5L16.5 9H20l1 2.5z"/><path d="M21.5 9l-.5 2.5M22.5 9.5l-.5 2M23.5 10l-.5 1.5"/><path d="M13 14h6q1 0 1-1 0-1-1-1H4"/><path d="M27 11.5h2"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="7.5" cy="15" r="0.5"/><circle cx="25" cy="15" r="1.5"/><circle cx="25" cy="15" r="0.5"/></svg>`,
    wheel: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><path d="M12 6v6l5.7-1.9M12 12l3.5 4.9M12 12l-3.5 4.9M12 12l-5.7-1.9"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
    plate: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="4" y1="22" x2="16" y2="22"/><path d="M 5 22 c 0-2 1-3 1.5-3 s 1.5 1 1.5 3 M 8.5 22 c 0-2 1-3 1.5-3 s 1.5 1 1.5 3 M 12 22 c 0-2 1-3 1.5-3 s 1.5 1 1.5 3"/><path d="M 4 15 l 1 2.5 a 1.5 1.5 0 0 0 1.5 1.5 h 7 a 1.5 1.5 0 0 0 1.5-1.5 l 1-2.5 Z"/><path d="M 16 16 h 6.5 a 1 1 0 0 0 0-2 h-7"/><path d="M 6 15 a 1.5 1.5 0 0 1 3 0 M 11 15 a 1.5 1.5 0 0 1 3 0"/><g transform="translate(6, 6) rotate(-45)"><rect x="-2.5" y="-4" width="5" height="7" rx="1"/><path d="M -2.5 3 a 2.5 2.5 0 0 0 5 0 Z"/></g><path stroke-dasharray="1 2" d="M 7.5 9 q 1 2 -1 6 M 10 7.5 q 2 2 0 7.5 M 12.5 6 q 3 2 1 9"/></svg>`,
    cutlery: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M5 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M9 2v20"/><path d="M17 2c-2.2 0-4 1.8-4 4s1.8 5 4 5s4-1.8 4-5s-1.8-4-4-4Z"/><path d="M17 11v11"/></svg>`,
    mountain: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
    compass: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    camera: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    image: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    gamepad: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="7"/><rect x="8" y="7" width="8" height="10"/><path d="M 10 14 l 3 -3 M 12 15 l 2 -2"/><circle cx="4.5" cy="12" r="2"/><path d="M 4.5 10 v 1 M 4.5 14 v -1 M 2.5 12 h 1 M 6.5 12 h -1"/><circle cx="19.5" cy="12" r="1.5"/><path d="M 19.5 9.5 v 1 M 19.5 13.5 v 1 M 17 12 h 1 M 21 12 h 1"/></svg>`,
    swords: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>`,
    music: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    headphones: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
    tech: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    code: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    plant: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M 4 21 Q 12 17 20 21"/><path d="M 12 21 v -6"/><path d="M 12 15 Q 16 15 19 6 Q 13 7 12 15"/><path d="M 12 17 Q 8 17 5 8 Q 11 9 12 17"/></svg>`,
    flower: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><g transform="rotate(0 12 12)"><path d="M 12 11 Q 18 5 13.5 2 L 12 3.5 L 10.5 2 Q 6 5 12 11"/></g><g transform="rotate(72 12 12)"><path d="M 12 11 Q 18 5 13.5 2 L 12 3.5 L 10.5 2 Q 6 5 12 11"/></g><g transform="rotate(144 12 12)"><path d="M 12 11 Q 18 5 13.5 2 L 12 3.5 L 10.5 2 Q 6 5 12 11"/></g><g transform="rotate(216 12 12)"><path d="M 12 11 Q 18 5 13.5 2 L 12 3.5 L 10.5 2 Q 6 5 12 11"/></g><g transform="rotate(288 12 12)"><path d="M 12 11 Q 18 5 13.5 2 L 12 3.5 L 10.5 2 Q 6 5 12 11"/></g></svg>`,
    tree: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22v-8"/><path d="M12 8l4 4"/><path d="M12 8l-4 4"/><path d="M12 3l4 4"/><path d="M12 3l-4 4"/></svg>`
};

const descriptions = {
    Automotive: "Passionate about modern engineering and performance. Exploring design language, aerodynamics, and the raw mechanics of motion.",
    Cooking: "Exploring cultural histories through culinary traditions, flavor profiles, and the science of gastronomy.",
    Adventure: "Seeking unknown paths. From alpine trails to navigating entirely new environments and challenges.",
    Photography: "Capturing fleeting moments and architectural symmetry. Focusing on lighting, exposure, and raw composition.",
    Gaming: "Analyzing interactive narratives, game loops, and the psychology behind engaging user experiences.",
    Music: "Deconstructing rhythm and soundscapes. How auditory experiences shape emotion and drive atmospheric focus.",
    Technology: "Obsessed with the bleeding edge. From hardware architecture to the algorithms that dictate the future.",
    Plants: "Cultivating indoor environments. Understanding the patience and precise variables required for growth."
};

const interestImages = {
    Automotive: "images/car.webp",
    Cooking: "images/cooking.webp",
    Adventure: "images/adventure.webp",
    Photography: "images/photography.webp",
    Gaming: "images/gaming.webp",
    Music: "images/music.webp",
    Technology: "images/technology.webp",
    Plants: "images/plants.webp"
};

// Warm the wheel images right away. Coming from the main page these
// are already in cache (main.js preloads them while the user idles),
// so this loop is free; on a direct landing it prevents lag/flashing
// when the wheel spins to an image that hasn't loaded yet.
Object.values(interestImages).forEach(src => {
    const img = new Image();
    img.src = src;
});

let trackRotation = 0;
let targetTrackRotation = 0;
let orbitProgress = 0;
let targetOrbitProgress = 0;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');
    const chH = document.querySelector('.crosshair-h');
    const chV = document.querySelector('.crosshair-v');
    // Hide the OS pointer only now that JS is running and the custom crosshair
    // exists; on touch the media query restores the system cursor regardless.
    if (cursor) document.body.classList.add('custom-cursor-active');

    let cursorVisible = false;

    let isCursorUpdating = false;

    // Crosshair logic
    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;

        if (!cursorVisible) {
            if (cursor) cursor.classList.add('active');
            if (chH) chH.classList.add('active');
            if (chV) chV.classList.add('active');
            cursorVisible = true;
        }
        
        if (!isCursorUpdating) {
            requestAnimationFrame(() => {
                if(cursor) cursor.style.transform = `translate3d(calc(${cursorX}px - 50%), calc(${cursorY}px - 50%), 0)`;
                if(chH) chH.style.transform = `translate3d(0, ${cursorY}px, 0)`;
                if(chV) chV.style.transform = `translate3d(${cursorX}px, 0, 0)`;
                isCursorUpdating = false;
            });
            isCursorUpdating = true;
        }
    });

    document.addEventListener('mouseleave', () => {
        if (cursor) cursor.classList.remove('active');
        if (chH) chH.classList.remove('active');
        if (chV) chV.classList.remove('active');
        cursorVisible = false;
    });

    document.addEventListener('mouseenter', () => {
        if (cursor) cursor.classList.add('active');
        if (chH) chH.classList.add('active');
        if (chV) chV.classList.add('active');
        cursorVisible = true;
    });

    const interactiveElements = document.querySelectorAll('.interactive-element, a, button');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if(cursor) cursor.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            if(cursor) cursor.classList.remove('hover');
        });
    });

    // 3D Wheel Logic
    const wheelTrack = document.getElementById('wheel-track');
    const wheelNodes = document.querySelectorAll('.wheel-node');
    const interestsBg = document.getElementById('interests-bg');
    const interestXrayMask = document.getElementById('interest-xray-mask');
    const detailTitle = document.getElementById('detail-title');
    const detailDesc = document.getElementById('detail-desc');
    const detailPanel = document.getElementById('interests-details');
    
    let targetXrayRadius = 0;
    let currentXrayRadius = 0;

    if (wheelNodes.length > 0) {
        const totalNodes = wheelNodes.length;

        wheelNodes.forEach((node, index) => {
            const angle = (index / totalNodes) * Math.PI * 2;
            node.dataset.baseAngle = angle;
            node.dataset.hovered = "false";

            // Keyboard + screen-reader access: each interest is a focusable
            // button whose label carries the full description, so assistive-tech
            // users get the same content the hover/scroll reveal gives mouse users.
            const interestName = node.dataset.text;
            node.setAttribute('tabindex', '0');
            node.setAttribute('role', 'button');
            node.setAttribute('aria-label', interestName + '. ' + (descriptions[interestName] || ''));
            node.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    node.click();
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    (node.nextElementSibling || wheelTrack.firstElementChild).focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    (node.previousElementSibling || wheelTrack.lastElementChild).focus();
                }
            });

            node.addEventListener('mouseenter', () => node.dataset.hovered = "true");
            node.addEventListener('mouseleave', () => node.dataset.hovered = "false");

            // Allow clicking nodes to rotate them to center
            node.addEventListener('click', () => {
                const nodeAngleDeg = angle * (180 / Math.PI);
                
                // Calculate shortest path to the new angle
                let diff = (nodeAngleDeg - targetTrackRotation) % 360;
                
                if (diff > 180) diff -= 360;
                else if (diff <= -180) diff += 360;
                
                targetTrackRotation += diff;
            });
        });

        function updateOrbitProgress() {
            const section = document.getElementById('interests');
            if (section) {
                const sectionTop = section.offsetTop;
                const currentScroll = window.scrollY - sectionTop;
                const totalScrollDistance = section.offsetHeight - window.innerHeight;
                
                if (totalScrollDistance > 0) {
                    if (currentScroll >= 0 && currentScroll <= totalScrollDistance) {
                        targetOrbitProgress = currentScroll / totalScrollDistance;
                    } else if (currentScroll < 0) {
                        targetOrbitProgress = 0;
                    } else {
                        targetOrbitProgress = 1;
                    }
                }
            }
        }

        window.addEventListener('scroll', updateOrbitProgress, { passive: true });
        window.addEventListener('resize', updateOrbitProgress, { passive: true });
        updateOrbitProgress();

        window.addEventListener('wheel', (e) => {
            const section = document.getElementById('interests');
            if(section) {
                const sectionTop = section.offsetTop;
                const currentScroll = window.scrollY - sectionTop;
                
                if (currentScroll > -window.innerHeight && currentScroll < section.offsetHeight + window.innerHeight) {
                    if (typeof window.lastSnap === 'undefined') window.lastSnap = 0;
                    targetTrackRotation += e.deltaY * 0.15; 
                    
                    clearTimeout(window.snapTimeout);
                    const snapAngle = 360 / totalNodes;
                    window.snapTimeout = setTimeout(() => {
                        let rounded = Math.round(targetTrackRotation / snapAngle) * snapAngle;
                        if (rounded === window.lastSnap) {
                            if (targetTrackRotation > window.lastSnap + 2) {
                                rounded = window.lastSnap + snapAngle;
                            } else if (targetTrackRotation < window.lastSnap - 2) {
                                rounded = window.lastSnap - snapAngle;
                            }
                        }
                        targetTrackRotation = rounded;
                        window.lastSnap = targetTrackRotation;
                    }, 150);
                }
            }
        }, { passive: true });

        function animateWheel() {
            if(wheelTrack) {
                trackRotation += (targetTrackRotation - trackRotation) * 0.05;
                orbitProgress += (targetOrbitProgress - orbitProgress) * 0.05;
                
                let maxZ = -Infinity;
                let maxZNode = null;
                const isMobile = window.innerWidth <= 768;

                wheelNodes.forEach((node) => {
                    const baseAngle = parseFloat(node.dataset.baseAngle);
                    const globalAngle = baseAngle - trackRotation * (Math.PI / 180);
                    const z0 = Math.cos(globalAngle) * 120;
                    const z1 = Math.cos(globalAngle) * 300;
                    const z = z0 * (1 - orbitProgress) + z1 * orbitProgress;
                    if (z > maxZ) { maxZ = z; maxZNode = node; }
                });

                if (maxZNode) {
                    interestsBg.style.opacity = '1';
                    
                    // Restore Copy8 logic: Hovering the center node reveals the X-ray peek effect
                    targetXrayRadius = maxZNode.dataset.hovered === "true" ? (isMobile ? 250 : 400) : 0;
                    
                    // compare textContent, not innerText: the title renders
                    // text-transform: uppercase, so innerText reads back
                    // "AUTOMOTIVE" vs dataset "Automotive" and the guard would
                    // fail every frame, re-fetching the image and restarting
                    // the blur transition forever
                    if (detailTitle.textContent !== maxZNode.dataset.text) {
                        const newText = maxZNode.dataset.text;
                        const imgPath = interestImages[newText];
                        const interestBaseImg = document.getElementById('interest-base-img');
                        const interestXrayImg = document.getElementById('interest-xray-img');
                        const bgContainer = document.getElementById('interests-bg');

                        detailTitle.textContent = newText;
                        detailDesc.textContent = descriptions[newText] || "";
                        
                        if(imgPath && interestBaseImg && interestXrayImg) {
                            interestBaseImg.src = imgPath;
                            interestXrayImg.src = imgPath;
                            
                            if(bgContainer) {
                                bgContainer.style.transition = 'none';
                                bgContainer.style.filter = 'blur(15px)';
                                void bgContainer.offsetWidth;
                                bgContainer.style.transition = 'filter 0.4s ease-out';
                                bgContainer.style.filter = 'blur(0px)';
                            }
                        }
                    }
                } else {
                    interestsBg.style.opacity = '0';
                    targetXrayRadius = 0;
                }
                
                // Details panel only shows if scrolled down (which is disabled on PC now via 100vh)
                // or if forced on mobile via CSS
                detailPanel.style.opacity = orbitProgress > 0.5 ? (orbitProgress - 0.5) * 2 : 0;

                currentXrayRadius += (targetXrayRadius - currentXrayRadius) * 0.1;
                if(interestXrayMask) {
                    const sectionRect = document.getElementById('interests-sticky').getBoundingClientRect();
                    const localX = isMobile ? window.innerWidth / 2 : cursorX - sectionRect.left;
                    const localY = isMobile ? window.innerHeight * 0.4 : cursorY - sectionRect.top;
                    interestXrayMask.style.clipPath = `circle(${currentXrayRadius}px at ${localX}px ${localY}px)`;
                }

                wheelNodes.forEach((node) => {
                    const baseAngle = parseFloat(node.dataset.baseAngle);
                    const globalAngle = baseAngle - trackRotation * (Math.PI / 180);
                    
                    const radius = Math.min(350, window.innerWidth * 0.4);
                    const x0 = Math.sin(globalAngle) * radius;
                    const y0 = 0;
                    const z0 = Math.cos(globalAngle) * 120;
                    const rZ0 = 120;

                    const isMobile = window.innerWidth <= 768;
                    const x1 = isMobile ? 0 : -window.innerWidth * 0.25; 
                    const y1 = isMobile ? Math.sin(globalAngle) * 350 - 150 : Math.sin(globalAngle) * 600; 
                    const z1 = Math.cos(globalAngle) * 300;
                    const rZ1 = 300;
                    
                    const x = x0 * (1 - orbitProgress) + x1 * orbitProgress;
                    const y = y0 * (1 - orbitProgress) + y1 * orbitProgress;
                    const z = z0 * (1 - orbitProgress) + z1 * orbitProgress;
                    const rZ = rZ0 * (1 - orbitProgress) + rZ1 * orbitProgress;
                    
                    const scale0 = (z0 + rZ0) / (2 * rZ0) * 0.5 + 0.5;
                    const maxScale = isMobile ? 1.0 : 2.0;
                    const scale1 = (z1 + rZ1) / (2 * rZ1) * maxScale + 0.5; 
                    const scale = scale0 * (1 - orbitProgress) + scale1 * orbitProgress;
                    
                    let opacity = (z + rZ) / (2 * rZ) * 0.8 + 0.2; 
                    let blurPx = 0;
                    
                    if (isMobile) {
                        const depth = 1 - ((z + rZ) / (2 * rZ)); // 0 at front, 1 at back
                        opacity = (z + rZ) / (2 * rZ) * 0.95 + 0.05; // Fade darker in back
                        blurPx = depth * 5; // Up to 5px blur based on depth
                    }
                    
                    node.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                    node.style.zIndex = Math.round(z + rZ);
                    node.style.opacity = opacity;
                    node.style.filter = blurPx > 0.1 ? `blur(${blurPx}px)` : 'none';

                    const desiredHTML = (node === maxZNode && z > rZ * 0.9) 
                        ? (node.dataset.hovered === "true" ? svgs[node.dataset.icon2] : svgs[node.dataset.icon1]) 
                        : node.dataset.text;
                        
                    if (node.innerHTML !== desiredHTML) {
                        node.innerHTML = desiredHTML;
                    }
                });
            }
            requestAnimationFrame(animateWheel);
        }
        animateWheel();
    }

    // Mobile Virtual Joystick Logic
    const joystickBase = document.getElementById('joystick-base');
    const joystickPuck = document.getElementById('joystick-puck');

    if(joystickBase && joystickPuck) {
        let isDragging = false;
        let startY = 0;
        let puckY = 0;
        let puckActiveY = 0;
        let dragStartRotation = 0;
        const maxTravel = 25;

        joystickBase.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            dragStartRotation = targetTrackRotation;
            joystickPuck.style.transition = 'none';
            e.preventDefault();
        }, { passive: false });

        joystickBase.addEventListener('touchmove', (e) => {
            if(!isDragging) return;
            const currentY = e.touches[0].clientY;
            let deltaY = currentY - startY;

            puckY = Math.max(-maxTravel, Math.min(maxTravel, deltaY));
            joystickPuck.style.transform = `translateY(${puckY}px)`;
            puckActiveY = puckY;
            e.preventDefault();
        }, { passive: false });

        function resetJoystick() {
            const wasDragging = isDragging;
            isDragging = false;
            puckActiveY = 0;
            puckY = 0;
            joystickPuck.style.transition = 'transform 0.2s ease-out';
            joystickPuck.style.transform = `translateY(0px)`;
            
            if (wasDragging) {
                // Directional magnetic snap when released
                const wheelNodes = document.querySelectorAll('.wheel-node');
                if (wheelNodes.length > 0) {
                    const snapAngle = 360 / wheelNodes.length;
                    const deltaRot = targetTrackRotation - dragStartRotation;
                    const startSnap = Math.round(dragStartRotation / snapAngle) * snapAngle;
                    
                    if (deltaRot > 0.5) {
                        // Guaranteed snap forward
                        const targetSnap = Math.ceil(targetTrackRotation / snapAngle) * snapAngle;
                        targetTrackRotation = Math.max(targetSnap, startSnap + snapAngle);
                    } else if (deltaRot < -0.5) {
                        // Guaranteed snap backward
                        const targetSnap = Math.floor(targetTrackRotation / snapAngle) * snapAngle;
                        targetTrackRotation = Math.min(targetSnap, startSnap - snapAngle);
                    } else {
                        targetTrackRotation = Math.round(targetTrackRotation / snapAngle) * snapAngle;
                    }
                }
            }
        }

        joystickBase.addEventListener('touchend', resetJoystick);
        joystickBase.addEventListener('touchcancel', resetJoystick);
        document.addEventListener('touchend', resetJoystick);
        document.addEventListener('touchcancel', resetJoystick);

        // Continuous spin loop
        function applyJoystickSpin() {
            if (isDragging && Math.abs(puckActiveY) > 2) {
                targetTrackRotation += (puckActiveY * 0.15);
            }
            requestAnimationFrame(applyJoystickSpin);
        }
        applyJoystickSpin();
    }
});
