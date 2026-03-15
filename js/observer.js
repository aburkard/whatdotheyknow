// ============================================
// observer.js — Real-time reactive narration
// "We're watching you" floating commentary
// ============================================

import { playTick } from './audio.js';

export function createObserver() {
    // --- Create the UI ---
    const bar = document.createElement('div');
    bar.id = 'observer-bar';
    bar.innerHTML = '<span id="observer-text"></span>';
    document.body.appendChild(bar);

    const textEl = bar.querySelector('#observer-text');
    let queue = [];
    let isShowing = false;
    let lastMessageTime = 0;
    let suppressUntil = 0;
    const MIN_GAP = 4000; // Minimum ms between messages
    const DISPLAY_TIME = 3500;

    function say(msg, priority = 0) {
        const now = Date.now();
        if (now < suppressUntil) return;

        if (priority >= 2) {
            // High priority — show immediately
            queue.unshift(msg);
            if (!isShowing) showNext();
        } else {
            queue.push(msg);
            if (!isShowing && now - lastMessageTime > MIN_GAP) showNext();
        }
    }

    function showNext() {
        if (queue.length === 0) {
            isShowing = false;
            return;
        }
        isShowing = true;
        const msg = queue.shift();
        lastMessageTime = Date.now();

        textEl.textContent = msg;
        bar.classList.add('is-visible');
        playTick();

        setTimeout(() => {
            bar.classList.remove('is-visible');
            setTimeout(() => {
                isShowing = false;
                if (queue.length > 0) {
                    setTimeout(showNext, 800);
                }
            }, 500);
        }, DISPLAY_TIME);
    }

    function suppress(ms) {
        suppressUntil = Date.now() + ms;
    }

    // --- Track state ---
    let mouseX = 0, mouseY = 0;
    let lastMoveTime = Date.now();
    let isIdle = false;
    let hasLeftViewport = false;
    let totalTabSwitches = 0;
    let lastTabLeaveTime = 0;
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();
    let scrollBackCount = 0;
    let hasCommented = new Set(); // Prevent repeating comments
    let startTime = Date.now();

    // --- Mouse tracking ---
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        lastMoveTime = Date.now();

        if (isIdle) {
            isIdle = false;
            // Don't comment on returning from idle — too noisy
        }

        // Mouse near top-right (close button area)
        const nearClose = mouseX > window.innerWidth * 0.85 && mouseY < 40;
        if (nearClose && !hasCommented.has('close')) {
            hasCommented.add('close');
            say('Thinking about closing this tab?');
        }

        // Mouse near address bar
        if (mouseY < 10 && !hasCommented.has('addressbar')) {
            hasCommented.add('addressbar');
            say('Moving toward the address bar. Going somewhere?');
        }
    });

    // Mouse leaves viewport
    document.addEventListener('mouseleave', () => {
        if (!hasLeftViewport) {
            hasLeftViewport = true;
            say('Your cursor just left the browser window.', 1);
        }
    });

    document.addEventListener('mouseenter', () => {
        if (hasLeftViewport) {
            hasLeftViewport = false;
            // Only comment if they were gone a while
        }
    });

    // --- Idle detection ---
    setInterval(() => {
        const idle = Date.now() - lastMoveTime;
        if (idle > 8000 && !isIdle) {
            isIdle = true;
            if (!hasCommented.has('idle1')) {
                hasCommented.add('idle1');
                say('You\u2019ve stopped moving.');
            } else if (!hasCommented.has('idle2')) {
                hasCommented.add('idle2');
                say('Still there?');
            }
        }
    }, 3000);

    // --- Scroll tracking ---
    let fastScrollCount = 0;
    let slowReadCount = 0;

    document.addEventListener('scroll', () => {
        const now = Date.now();
        const y = window.scrollY;
        const dy = y - lastScrollY;
        const dt = now - lastScrollTime;

        // Scroll back up
        if (dy < -100 && !hasCommented.has('scrollback1')) {
            scrollBackCount++;
            if (scrollBackCount >= 2) {
                hasCommented.add('scrollback1');
                say('You keep scrolling back up. Something\u2019s sticking with you.');
            }
        }

        // Very fast scrolling
        if (dt > 0 && Math.abs(dy) / dt > 5) {
            fastScrollCount++;
            if (fastScrollCount >= 3 && !hasCommented.has('fastscroll')) {
                hasCommented.add('fastscroll');
                say('You\u2019re scrolling fast. It gets more interesting, promise.');
            }
        }

        // Near the bottom
        const nearBottom = (y + window.innerHeight) >= document.body.scrollHeight - 200;
        if (nearBottom && !hasCommented.has('bottom')) {
            hasCommented.add('bottom');
            say('You made it to the end. Most people don\u2019t.');
        }

        lastScrollY = y;
        lastScrollTime = now;
    }, { passive: true });

    // --- Tab visibility ---
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            totalTabSwitches++;
            lastTabLeaveTime = Date.now();

            if (totalTabSwitches === 1) {
                say('You just switched away. We noticed.', 2);
            } else if (totalTabSwitches === 3 && !hasCommented.has('tabs3')) {
                hasCommented.add('tabs3');
                say('Third time you\u2019ve left. Checking if what we said is true?', 2);
            }
        } else {
            const awayTime = Date.now() - lastTabLeaveTime;
            if (awayTime > 10000 && !hasCommented.has('longaway')) {
                hasCommented.add('longaway');
                say(`You were gone for ${Math.round(awayTime / 1000)} seconds. Welcome back.`, 2);
            }
        }
    });

    // --- Keyboard ---
    document.addEventListener('keydown', (e) => {
        // DevTools
        if ((e.key === 'F12') ||
            (e.metaKey && e.altKey && e.key === 'i') ||
            (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            if (!hasCommented.has('devtools')) {
                hasCommented.add('devtools');
                say('Opening DevTools? Go ahead \u2014 it\u2019s all client-side. No tricks.', 2);
            }
        }

        // Copy
        if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
            if (!hasCommented.has('copy')) {
                hasCommented.add('copy');
                say('Copying something. Planning to share this?');
            }
        }
    });

    // --- Right-click ---
    document.addEventListener('contextmenu', () => {
        if (!hasCommented.has('rightclick')) {
            hasCommented.add('rightclick');
            say('Right-click. Inspecting the source?');
        }
    });

    // --- Text selection ---
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (sel && sel.toString().length > 20 && !hasCommented.has('selection')) {
            hasCommented.add('selection');
            say('Highlighting text. Saving this for later?');
        }
    });

    // --- Window resize ---
    let lastResizeComment = 0;
    window.addEventListener('resize', () => {
        const now = Date.now();
        if (now - lastResizeComment > 10000 && !hasCommented.has('resize')) {
            hasCommented.add('resize');
            lastResizeComment = now;
            say('Resizing the window. We\u2019re still watching.');
        }
    });

    // --- Time-based observations ---
    setTimeout(() => {
        if (!hasCommented.has('time60')) {
            hasCommented.add('time60');
            say('You\u2019ve been here for a minute. Most visitors leave after 20 seconds.');
        }
    }, 60000);

    setTimeout(() => {
        if (!hasCommented.has('time180')) {
            hasCommented.add('time180');
            say('Three minutes. You\u2019re really reading everything.');
        }
    }, 180000);

    // --- Section-aware commentary ---
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.dataset.section;
            if (!id) return;

            // Delayed section-specific comments
            const sectionComments = {
                'hardware': { msg: 'Yes, we can see your GPU model.', delay: 3000 },
                'network': { msg: 'Your ISP, by the way, can see everything too.', delay: 4000 },
                'preferences': { msg: 'This is where it gets personal.', delay: 2000 },
                'deeper': { msg: 'Most websites don\u2019t go this far. Most websites don\u2019t tell you.', delay: 3000 },
                'behavior': { msg: 'Everything you\u2019ve done on this page has been recorded.', delay: 2000 },
                'fingerprint': { msg: 'This is you. Unique. Trackable.', delay: 4000 },
                'profile': { msg: 'All of this from a single page visit.', delay: 3000 },
            };

            const c = sectionComments[id];
            if (c && !hasCommented.has('section-' + id)) {
                hasCommented.add('section-' + id);
                setTimeout(() => say(c.msg), c.delay);
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.section[data-section]').forEach(s => {
        sectionObserver.observe(s);
    });

    // Initial message after a beat
    setTimeout(() => {
        say('We\u2019re watching.', 2);
    }, 2000);

    return { say, suppress };
}
