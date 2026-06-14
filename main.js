document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');
    const chH = document.querySelector('.crosshair-h');
    const chV = document.querySelector('.crosshair-v');
    
    let cursorVisible = false;
    
    // Only run cursor logic on devices that support hover (not touchscreens)
    const isTouchDevice = window.matchMedia("(any-hover: none)").matches;
    
    if (!isTouchDevice) {
        let mouseX = 0;
        let mouseY = 0;
        let isCursorUpdating = false;

        // Crosshair logic
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            if (!cursorVisible) {
                if (cursor) cursor.classList.add('active');
                if (chH) chH.classList.add('active');
                if (chV) chV.classList.add('active');
                cursorVisible = true;
            }
            
            if (!isCursorUpdating) {
                requestAnimationFrame(() => {
                    if (cursor) {
                        cursor.style.transform = `translate3d(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%), 0)`;
                    }
                    if (chH) {
                        chH.style.transform = `translate3d(0, ${mouseY}px, 0)`;
                    }
                    if (chV) {
                        chV.style.transform = `translate3d(${mouseX}px, 0, 0)`;
                    }
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

        // Hover states
        const interactiveElements = document.querySelectorAll('a, button, .panel:not(.scope-host), .project-panel, .skill-panel, .timeline-item, .interactive-element');
        
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (cursor) cursor.classList.add('hover');
            });
            el.addEventListener('mouseleave', () => {
                if (cursor) cursor.classList.remove('hover');
            });
        });
    }

    // Smooth scrolling for anchor links. A bare "#" (the logo) means
    // top of page - it is not a valid querySelector argument
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href === '#') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Toggle Locked Certifications
    const toggleLockedBtn = document.getElementById('toggle-locked-btn');
    const lockedCerts = document.querySelectorAll('.locked-cert');
    
    if (toggleLockedBtn && lockedCerts.length > 0) {
        const updateCertsHint = () => {
            const certsHint = document.getElementById('certs-hint');
            const certsGridLocal = document.getElementById('certs-grid');
            if (certsHint && certsGridLocal) {
                const totalCerts = certsGridLocal.querySelectorAll('.skill-panel');
                let visibleCount = 0;
                totalCerts.forEach(cert => {
                    if (cert.style.display !== 'none') {
                        visibleCount++;
                    }
                });
                certsHint.innerText = `[ ${visibleCount} ITEMS HIDDEN ]`;
            }
        };

        // Initialize on load
        updateCertsHint();

        toggleLockedBtn.addEventListener('click', () => {
            toggleLockedBtn.classList.toggle('active');
            
            const isHidden = lockedCerts[0].style.display === 'none';
            
            lockedCerts.forEach(cert => {
                cert.style.display = isHidden ? 'block' : 'none';
            });
            
            toggleLockedBtn.innerText = isHidden ? '[ HIDE LOCKED ]' : '[ SHOW LOCKED ]';
            
            // Update the hint text dynamically
            updateCertsHint();
        });
    }
    // Active Navigation Highlight based on Scroll
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-links a');

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentId = entry.target.getAttribute('id');
                navItems.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${currentId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });
    


    // Mobile Loadout Dropdown Toggle
    const loadoutToggleBtn = document.getElementById('loadout-toggle-btn');
    const loadoutToggleIcon = document.getElementById('loadout-toggle-icon');
    const coreSkillsGrid = document.getElementById('core-skills-grid');
    const certsGrid = document.getElementById('certs-grid');
    const collapsedHints = document.querySelectorAll('.collapsed-hint');
    
    if (loadoutToggleBtn && loadoutToggleIcon && coreSkillsGrid && certsGrid) {
        loadoutToggleBtn.addEventListener('click', () => {
            coreSkillsGrid.classList.toggle('expanded');
            certsGrid.classList.toggle('expanded');
            if (toggleLockedBtn) toggleLockedBtn.classList.toggle('expanded');
            collapsedHints.forEach(hint => hint.classList.toggle('expanded'));

            if (coreSkillsGrid.classList.contains('expanded')) {
                loadoutToggleIcon.innerText = '[-]';
            } else {
                loadoutToggleIcon.innerText = '[+]';
            }
        });

        // While collapsed, the whole Loadout section is one tap target.
        // Once expanded, only the header collapses it again, so clicks on
        // the skill panels can't accidentally close the section.
        const skillsSection = document.getElementById('skills');
        if (skillsSection) {
            skillsSection.addEventListener('click', (e) => {
                if (coreSkillsGrid.classList.contains('expanded')) return;
                if (e.target.closest('#loadout-toggle-btn')) return; // header has its own listener
                loadoutToggleBtn.click();
            });
        }
    }

    // --- Mobile Overscroll Trigger for Tic-Tac-Toe ---
    let touchStartY = 0;
    let overscrollAmount = 0;
    const OVERSCROLL_THRESHOLD = 60; // pixels to push past bottom
    
    window.addEventListener('touchstart', (e) => {
        if (window.innerWidth <= 768) {
            touchStartY = e.touches[0].clientY;
        }
    }, {passive: true});
    
    window.addEventListener('touchmove', (e) => {
        if (window.innerWidth <= 768) {
            // Check if we are at the bottom of the page (within 5px tolerance)
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5) {
                const touchCurrentY = e.touches[0].clientY;
                const dy = touchStartY - touchCurrentY; // Positive dy means user is swiping up (scrolling down)
                if (dy > 0) {
                    overscrollAmount = dy;
                }
            }
        }
    }, {passive: true});
    
    window.addEventListener('touchend', (e) => {
        if (window.innerWidth <= 768 && overscrollAmount > OVERSCROLL_THRESHOLD) {
            // Check if overlay is already active
            if (!document.body.classList.contains('ttt-active')) {
                if (typeof window.openTicTacToeGame === 'function') {
                    window.openTicTacToeGame();
                }
            }
        }
        overscrollAmount = 0; // reset
    }, {passive: true});

});

// ============================================================
// ORIGIN FILE - dossier cards. Hover shows the arrow cue (CSS);
// click or tap opens the full declassified file in an overlay.
// Add new lines to DOSSIERS below - ['KEY', 'VALUE'] per row,
// with an optional 'dot' (pulsing status) or 'hot' (accent) flag.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('dsr-overlay');
    if (!overlay) return;

    const DOSSIERS = {
        left: {
            head: 'PERSONNEL FILE // DECLASSIFIED',
            title: 'Origin Story',
            body: 'My background is in computer science, and my instinct has always been to build systems that make life work better. I moved into business analytics and finished my MS at UMass Amherst to bridge the gap between writing code and driving strategy: I want to be the person who can build the thing and explain why it matters. I care less about the model that looks perfect on a slide, and more about the one that survives contact with real data. That bias comes from doing the work, because the messy middle of a real project teaches you more than a clean demo ever will.',
            lines: [
                ['LIVE STATUS', 'TUNING THE SITE', 'dot'],
                ['CURRENT GRIND', 'AI/ML'],
                ['SIGNAL RANGE', 'QUANTUM COMP TO ART'],
                ['GREEN PATCH', 'PLANTS ARE PART OF THE SETUP'],
                ['AFTER HOURS', 'ONLINE GAMES AND TOO MANY TABS'],
                ['THIS SITE', 'DESIGNED + BUILT SOLO, NO TEMPLATES']
            ]
        },
        right: {
            head: 'OFF THE CLOCK // DECRYPTED',
            title: 'Approach',
            body: 'Pragmatism over perfection, but pragmatism doesn’t mean cutting corners. A model that ships and gets monitored beats a perfect one stuck in a notebook. So I build for the whole lifecycle: clean the inputs, handle the edge cases, instrument the cost, and leave an audit trail the next person can actually read. Most of my work starts as a real inefficiency and ends as something a team can run without me in the room.',
            lines: [
                ['COORDINATES', 'HYD -> AMHERST'],
                ['SUMMER LOADOUT', 'HIKING / SWIMMING'],
                ['WINTER LOADOUT', 'SKIING / SNOWBOARDING / ICE SKATING'],
                ['SYSTEM FUEL', 'WATER. JUST WATER.'],
                ['NOW RUNNING', 'BUILDING / APPLYING / REPEAT'],
                ['EASTER EGG', 'THERE’S A GAME HIDDEN ON THIS SITE', 'game']
            ]
        }
    };

    const elHead = document.getElementById('dsr-d-head');
    const elTitle = document.getElementById('dsr-d-title');
    const elBrief = document.getElementById('dsr-d-brief');
    const elList = document.getElementById('dsr-d-list');
    const elFileNo = document.getElementById('dsr-file-no');
    const backBtn = document.getElementById('dsr-back');
    const nextBtn = document.getElementById('dsr-next');
    const sheet = overlay.querySelector('.msn-sheet');
    const ORDER = Object.keys(DOSSIERS);
    let currentKey = null;
    let entryKey = null;
    let lastFocus = null;
    let openedViaKeyboard = false;

    function openDossier(key, isKeyboard = false) {
        const d = DOSSIERS[key];
        if (!d) return;
        const wasOpen = overlay.classList.contains('active');
        if (!wasOpen) {
            lastFocus = document.activeElement;
            openedViaKeyboard = isKeyboard;
            entryKey = key;
        }
        currentKey = key;
        // files are numbered relative to the card that opened the popup:
        // the entry file is always FILE 01, the other one follows it
        const relPos = (ORDER.indexOf(key) - ORDER.indexOf(entryKey) + ORDER.length) % ORDER.length;
        elFileNo.textContent = 'FILE 0' + (relPos + 1) + ' / 0' + ORDER.length;
        nextBtn.innerHTML = relPos === ORDER.length - 1 ? '&larr; PREV FILE' : 'NEXT FILE &rarr;';
        elHead.textContent = d.head;
        elTitle.textContent = d.title;
        elBrief.textContent = d.body;
        elList.innerHTML = '';
        d.lines.forEach(([k, v, flag]) => {
            const li = document.createElement('li');
            const sk = document.createElement('span');
            sk.className = 'd-key';
            sk.textContent = k;
            const dots = document.createElement('div');
            dots.className = 'd-dots';
            const sv = document.createElement('span');
            sv.className = (flag === 'hot' || flag === 'game') ? 'd-val hot' : 'd-val';
            if (flag === 'dot') {
                const dot = document.createElement('span');
                dot.className = 'd-status-dot';
                sv.appendChild(dot);
            }
            sv.appendChild(document.createTextNode(v));
            li.append(sk, dots, sv);
            if (flag === 'game') {
                // the easter-egg row opens a how-to-play briefing
                li.classList.add('dsr-game-row');
                li.tabIndex = 0;
                li.setAttribute('role', 'button');
                li.setAttribute('aria-label', 'Open the hidden game briefing');
                li.addEventListener('click', showGameBriefing);
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        showGameBriefing();
                    }
                });
            }
            elList.appendChild(li);
        });
        overlay.classList.add('active');
        document.body.classList.add('msn-open');
        sheet.scrollTop = 0;
        // restart the staggered content rise on every open / file swap
        sheet.classList.remove('dsr-animate');
        void sheet.offsetWidth;
        sheet.classList.add('dsr-animate');
        if (!wasOpen) backBtn.focus();
    }

    function closeDossier() {
        overlay.classList.remove('active');
        document.body.classList.remove('msn-open');
        sheet.classList.remove('dsr-animate');
        if (lastFocus) {
            lastFocus.focus({ preventScroll: true });
            if (!openedViaKeyboard) {
                lastFocus.blur();
            }
        }
    }

    // GAME BRIEFING - the easter-egg row explains how to start the
    // hidden game, with instructions matching the device: the car is
    // desktop-only, phones get the overscroll game instead
    const alertOverlay = document.getElementById('sys-alert-overlay');

    function showGameBriefing() {
        if (!alertOverlay) return;
        const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches
            || window.innerWidth <= 768;
        document.getElementById('sys-alert-title').textContent = 'GAME BRIEFING';
        document.getElementById('sys-alert-msg').textContent = touch
            ? 'Close this file, scroll to the very bottom of the page, then pull up past the end one more time. The hidden game boots from there.'
            : 'Close this file and press W, A, S or D. A car spawns: steer with WASD, hold SHIFT to boost, hold SPACE to drift. Hit checkpoints to stay on the clock. ESC ends the run.';
        alertOverlay.classList.add('active');
        document.getElementById('sys-alert-btn').onclick = () => alertOverlay.classList.remove('active');
    }

    if (alertOverlay) {
        alertOverlay.addEventListener('click', (e) => {
            if (e.target === alertOverlay) alertOverlay.classList.remove('active');
        });
    }

    nextBtn.addEventListener('click', () => {
        // walk forward from the entry file; the last file steps back
        // instead of wrapping, so the files never cycle endlessly
        const len = ORDER.length;
        const relPos = (ORDER.indexOf(currentKey) - ORDER.indexOf(entryKey) + len) % len;
        const step = relPos === len - 1 ? -1 : 1;
        openDossier(ORDER[(ORDER.indexOf(currentKey) + step + len) % len]);
    });

    [['card-left', 'left'], ['card-right', 'right']].forEach(([id, key]) => {
        const card = document.getElementById(id);
        if (!card) return;
        card.addEventListener('click', () => openDossier(key, false));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDossier(key, true);
            }
        });
    });

    backBtn.addEventListener('click', closeDossier);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDossier(); });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        // the briefing sits on top of the file: close it first
        if (alertOverlay && alertOverlay.classList.contains('active')) {
            alertOverlay.classList.remove('active');
            return;
        }
        if (overlay.classList.contains('active')) closeDossier();
    });
});

// ============================================================
// MISSION HISTORY - grid declutter class. Replaces the CSS
// :has(:hover) selector, which re-evaluates on every mouse
// move across the grid and lags the cursor.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('#projects .grid-3');
    if (!grid) return;
    const update = (on) => grid.classList.toggle('previewing', on);
    grid.addEventListener('mouseover', (e) => update(!!e.target.closest('.project-panel')));
    grid.addEventListener('mouseleave', () => update(false));
    grid.addEventListener('focusin', (e) => {
        // only visible (keyboard) focus counts: the popup returns focus
        // programmatically on close, which must not re-fade the grid
        const panel = e.target.closest('.project-panel');
        update(!!panel && panel.matches(':focus-visible'));
    });
    grid.addEventListener('focusout', () => update(!!grid.querySelector('.project-panel:focus-visible')));
});

// ============================================================
// PROJECT CAROUSEL SCROLLBAR (mobile) - the native overlay
// indicator can't be grabbed and Chromium stops painting it after
// back-forward cache restores, so the carousel draws its own:
// hidden at rest, flashes while swiping, and the thumb drags like
// a real scrollbar. CSS in style.css under .proj-scrollbar.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('#projects .grid-3');
    if (!grid) return;

    const bar = document.createElement('div');
    bar.className = 'proj-scrollbar';
    bar.setAttribute('aria-hidden', 'true');
    const thumb = document.createElement('div');
    thumb.className = 'proj-scrollbar-thumb';
    bar.appendChild(thumb);
    grid.insertAdjacentElement('afterend', bar);

    let hideTimer = null;
    let dragging = false;

    function layout() {
        const max = grid.scrollWidth - grid.clientWidth;
        if (max <= 0) return false;
        const w = Math.max((grid.clientWidth / grid.scrollWidth) * bar.clientWidth, 28);
        const x = (grid.scrollLeft / max) * (bar.clientWidth - w);
        thumb.style.width = w + 'px';
        thumb.style.transform = 'translate(' + x + 'px, -50%)';
        return true;
    }

    function show() {
        if (!layout()) return;
        bar.classList.add('visible');
        clearTimeout(hideTimer);
        if (!dragging) hideTimer = setTimeout(() => bar.classList.remove('visible'), 900);
    }

    grid.addEventListener('scroll', show, { passive: true });
    window.addEventListener('resize', layout);

    // drag the thumb - or touch anywhere on the track - to scroll.
    // Snap is parked during the drag so the thumb tracks the finger
    // instead of jumping between snap points
    function dragTo(clientX) {
        const rect = bar.getBoundingClientRect();
        const usable = rect.width - thumb.offsetWidth;
        if (usable <= 0) return;
        const pos = Math.min(Math.max(clientX - rect.left - thumb.offsetWidth / 2, 0), usable);
        grid.scrollLeft = (pos / usable) * (grid.scrollWidth - grid.clientWidth);
    }
    bar.addEventListener('pointerdown', (e) => {
        dragging = true;
        grid.style.scrollSnapType = 'none';
        try { bar.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
        dragTo(e.clientX);
        show();
        e.preventDefault();
    });
    bar.addEventListener('pointermove', (e) => {
        if (dragging) { dragTo(e.clientX); show(); }
    });
    const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        // releasing the thumb should land like a swipe does: glide to
        // the nearest card center, then re-arm snapping once settled
        // (re-arming mid-glide would cancel it with an instant jump)
        const max = grid.scrollWidth - grid.clientWidth;
        const gRect = grid.getBoundingClientRect();
        let target = grid.scrollLeft;
        let best = Infinity;
        grid.querySelectorAll('.project-panel').forEach(p => {
            const r = p.getBoundingClientRect();
            const center = Math.min(Math.max(
                r.left - gRect.left + grid.scrollLeft + r.width / 2 - grid.clientWidth / 2, 0), max);
            const d = Math.abs(center - grid.scrollLeft);
            if (d < best) { best = d; target = center; }
        });
        const rearm = () => { if (!dragging) grid.style.scrollSnapType = ''; };
        if (Math.abs(target - grid.scrollLeft) < 1) {
            rearm();
        } else {
            grid.scrollTo({ left: target, behavior: 'smooth' });
            if ('onscrollend' in grid) grid.addEventListener('scrollend', rearm, { once: true });
            else setTimeout(rearm, 600);
        }
        show();
    };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);

    // returning via the back button: flash the bar as a swipe hint
    window.addEventListener('pageshow', (e) => { if (e.persisted) show(); });
});

// ============================================================
// BACKGROUND PRELOADER
// Sequentially loads large images for the Interests page while 
// the user is idle on the main page, preventing lag upon navigation.
// ============================================================
window.addEventListener('load', () => {
    const imagesToPreload = [
        "images/car.webp",
        "images/cooking.webp",
        "images/adventure.webp",
        "images/photography.webp",
        "images/gaming.webp",
        "images/music.webp",
        "images/technology.webp",
        "images/plants.webp"
    ];

    let index = 0;
    function loadNext() {
        if (index >= imagesToPreload.length) return;
        const img = new Image();
        img.onload = loadNext;
        img.onerror = loadNext;
        
        // 300ms delay between each image to avoid network spikes
        setTimeout(() => {
            img.src = imagesToPreload[index++];
        }, 300);
    }
    
    // Wait 2.5 seconds after main page load before starting
    setTimeout(loadNext, 2500);
});
