// ============================================
// main.js — Orchestrator
// ============================================

import {
    detectBasics, detectDevice, detectHardware, detectNetwork,
    detectFonts, detectCanvas, detectAudio, detectMisc, detectReferrer,
    detectPreferences, detectMediaDevices, detectMultiMonitor,
    detectStorage, detectWebRTC, createBehaviorTracker,
    detectRefreshRate, detectAdBlocker, createTabTracker,
    detectEmojiFingerprint, detectZoom, detectTaskbar,
    detectCodecs, benchmarkCPU, detectMemoryInfo,
    detectWebGPU, detectClientRects, detectWASMTiming,
    detectKeyboardLayout, detectMathFingerprint, detectExtensions,
    detectPhysicalScreen, createReadingTracker, detectScrollbar,
    detectVM, detectPrivacyProtection, detectColorProfile, generateCanvasDiff, detectCPUArch,
    sha256, computeFingerprint, estimateEntropy, analyzeStability,
    buildProfile, generateLLMPrompt,
} from './detect.js';

import { createObserver } from './observer.js';
import { initAudio, startDrone, playScanTone, playFingerprintTone, fadeDrone, playTick, toggleMute } from './audio.js';

import {
    narrate, comment, aside, divider, val, sleep,
    createHashDisplay, createFingerprintDisplay, createEntropyTable,
    createFontGrid, createVPNCallout, createDNTCallout,
    queueSectionReveal, setupScrollReveals, resetStagger,
    formatHugeNumber, setOnReveal,
} from './ui.js';

// Global data store
const data = {};

// --- ENTRY ---

// Always start at the top on load/refresh
window.scrollTo(0, 0);

document.getElementById('start-btn').addEventListener('click', start);

async function start() {
    const btn = document.getElementById('start-btn');
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.querySelector('.start-btn-text').textContent = 'Scanning\u2026';
    document.body.classList.add('is-started');

    // Start audio (requires user gesture — the click provides it)
    initAudio();
    startDrone();

    // Add mute button
    const muteBtn = document.createElement('button');
    muteBtn.id = 'mute-btn';
    muteBtn.innerHTML = '\ud83d\udd0a';
    muteBtn.setAttribute('aria-label', 'Toggle sound');
    muteBtn.addEventListener('click', () => {
        const muted = toggleMute();
        muteBtn.innerHTML = muted ? '\ud83d\udd07' : '\ud83d\udd0a';
    });
    document.body.appendChild(muteBtn);

    // Start behavior + tab tracking + observer immediately
    data.behaviorTracker = createBehaviorTracker();
    data.tabTracker = createTabTracker();
    data.observer = createObserver();

    // Run all detections in parallel
    const [basics, device, hardware, network, canvasData, audio, misc, referrer,
           preferences, mediaDevices, storage, webrtc] = await Promise.all([
        Promise.resolve(detectBasics()),
        Promise.resolve(detectDevice()),
        Promise.resolve(detectHardware()),
        detectNetwork(),
        Promise.resolve(detectCanvas()),
        detectAudio(),
        Promise.resolve(detectMisc()),
        Promise.resolve(detectReferrer()),
        Promise.resolve(detectPreferences()),
        detectMediaDevices(),
        detectStorage(),
        detectWebRTC(),
    ]);

    data.basics = basics;
    data.device = device;
    data.hardware = hardware;
    data.network = network;
    data.canvas = canvasData;
    data.audio = audio;
    data.misc = misc;
    data.referrer = referrer;
    data.preferences = preferences;
    data.mediaDevices = mediaDevices;
    data.multiMonitor = detectMultiMonitor();
    data.storage = storage;
    data.webrtc = webrtc;
    data.zoom = detectZoom();
    data.taskbar = detectTaskbar();
    data.codecs = detectCodecs();
    data.cpuBench = benchmarkCPU();
    data.memoryInfo = detectMemoryInfo();

    // Run additional async detections
    const [refreshRate, adBlocker, webgpu, wasmTiming, keyboardLayout, extensions] = await Promise.all([
        detectRefreshRate(),
        detectAdBlocker(),
        detectWebGPU(),
        detectWASMTiming(),
        detectKeyboardLayout(),
        detectExtensions(),
    ]);
    data.refreshRate = refreshRate;
    data.adBlocker = adBlocker;
    data.webgpu = webgpu;
    data.wasmTiming = wasmTiming;
    data.keyboardLayout = keyboardLayout;
    data.extensions = extensions;
    data.clientRects = detectClientRects();
    data.mathFingerprint = detectMathFingerprint();
    data.physicalScreen = detectPhysicalScreen();
    data.readingTracker = createReadingTracker();
    data.scrollbar = detectScrollbar();
    data.colorProfile = detectColorProfile();
    data.canvasDiff = generateCanvasDiff();
    data.cpuArch = detectCPUArch();

    // Store GPU renderer for VM detection
    window.__gpuRenderer = data.hardware?.gpu?.renderer || '';
    data.vm = detectVM();
    data.privacyProtection = detectPrivacyProtection();

    // Compute canvas hash + emoji hash
    const emojiData = detectEmojiFingerprint();
    data.emojiHash = await sha256(emojiData.dataUrl);
    data.canvasHash = await sha256(canvasData.dataUrl);

    // Font detection (can be slightly slow)
    data.fonts = detectFonts();

    // Compute combined fingerprint
    data.fingerprintHash = await computeFingerprint(data);

    // Compute entropy
    data.entropy = estimateEntropy(data);

    // Wait a beat for effect
    await sleep(400);

    // Setup section content builders
    setupSections();

    // Setup audio hooks for section reveals
    setOnReveal((sectionId, phase) => {
        if (phase === 'scanning') {
            playScanTone();
        }
        if (phase === 'revealed' && sectionId === 'fingerprint') {
            playFingerprintTone();
        }
    });

    // Fade drone when punchline reaches center of viewport
    let droneFaded = false;
    const punchlineEl = document.getElementById('punchline');
    if (punchlineEl) {
        const punchlineObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !droneFaded) {
                droneFaded = true;
                fadeDrone();
                punchlineObserver.disconnect();
            }
        }, {
            threshold: 0,
            rootMargin: '-40% 0px -40% 0px', // Only fires when element is in the middle 20% of viewport
        });
        punchlineObserver.observe(punchlineEl);
    }

    // Setup scroll-based reveals
    setupScrollReveals();

    // Scroll to first section
    document.getElementById('basics').scrollIntoView({ behavior: 'smooth' });
}

// --- SECTION BUILDERS ---

function setupSections() {

    // 01 — BASICS
    queueSectionReveal('basics', () => {
        const el = document.getElementById('basics-content');
        const b = data.basics;
        const n = data.network;

        if (n.geo?.city) {
            el.appendChild(narrate(
                `You\u2019re in or near ${val(n.geo.city)}, ${val(n.geo.country)}.`
            ));
        }

        el.appendChild(narrate(
            `It\u2019s ${val(b.time)} for you. ${val(b.date)}.`
        ));

        el.appendChild(narrate(
            `You speak ${val(b.languageName)}${b.languages.length > 1 ?
                `, among ${b.languages.length} configured language${b.languages.length > 1 ? 's' : ''}` : ''}.`
        ));

        el.appendChild(narrate(
            `Your timezone is ${val(b.tz)}.`
        ));

        // Notable referrer source
        const r = data.referrer;
        const notableSources = {
            'hackernews': 'Hacker News', 'ycombinator': 'Hacker News',
            'reddit': 'Reddit', 'twitter': 'Twitter', 't.co': 'Twitter',
            'facebook': 'Facebook', 'linkedin': 'LinkedIn',
            'lobste.rs': 'Lobsters', 'mastodon': 'Mastodon',
        };
        if (r.source !== 'direct' && r.referrer) {
            const refLower = r.referrer.toLowerCase();
            const matchedKey = Object.keys(notableSources).find(k => refLower.includes(k));
            if (matchedKey) {
                el.appendChild(narrate(`You came here from ${val(notableSources[matchedKey])}.`));
            }
        }
    }, 1000);

    // 02 — DEVICE
    queueSectionReveal('device', () => {
        const el = document.getElementById('device-content');
        const d = data.device;

        // Show Brave as the browser if detected, not Chrome
        const browserName = data.privacyProtection?.isBrave ? 'Brave' : d.browser;
        let deviceLine = `You\u2019re running ${val(d.os + (d.osVersion ? ' ' + d.osVersion : ''))}`;
        deviceLine += ` with ${val(browserName + ' ' + d.browserVersion)}.`;
        el.appendChild(narrate(deviceLine));

        if (d.deviceGuess) {
            el.appendChild(narrate(`That looks like ${val(d.deviceGuess)}.`));
        }

        const s = d.screen;
        el.appendChild(narrate(
            `Your screen is ${val(s.width + '\u00d7' + s.height)} pixels at ${val(s.pixelRatio + 'x')} density. ` +
            `Color depth: ${val(s.colorDepth + '-bit')}.`
        ));

        if (d.touchSupport) {
            el.appendChild(narrate(
                `Touch screen detected with ${val(d.maxTouchPoints + ' touch points')}.`
            ));
        }

        // Zoom level
        if (data.zoom.zoom !== 100 && data.zoom.comment) {
            el.appendChild(narrate(data.zoom.comment));
        }

        // Physical screen size — only show if the estimate is reasonable
        const ps = data.physicalScreen;
        if (ps.confident && ps.name) {
            el.appendChild(narrate(
                `That\u2019s a ${val(ps.estimated + '-inch')} display. ${val(ps.name)}.`
            ));
        } else if (ps.estimated && ps.estimated >= 4 && ps.estimated <= 50) {
            // Only show fallback estimate if it's a plausible screen size
            // (not a TV and not a watch — avoids embarrassing wrong guesses from farbled resolutions)
            el.appendChild(narrate(
                `Your display is approximately ${val(ps.estimated + ' inches')} diagonally.`
            ));
        }

        // Taskbar/dock
        if (data.taskbar.comment) {
            el.appendChild(narrate(data.taskbar.comment));
        }

        el.appendChild(comment(
            'Your user agent string alone reveals most of this. It\u2019s sent with every HTTP request.'
        ));
    }, 800);

    // 03 — HARDWARE
    queueSectionReveal('hardware', () => {
        const el = document.getElementById('hardware-content');
        const h = data.hardware;
        const isBrave = data.privacyProtection?.isBrave;
        const maybefarbled = isBrave ? ' (maybe farbled)' : '';

        // Show Brave protection notice FIRST so farbled values have context
        if (data.privacyProtection.isProtected) {
            el.appendChild(comment(
                data.privacyProtection.isBrave
                    ? 'Brave detected \u2014 it randomizes hardware values, canvas, and audio to protect your fingerprint. Some values below may be intentionally wrong.'
                    : 'Your browser appears to be obfuscating some signals. Values below may not reflect your actual hardware.'
            ));
            el.appendChild(divider());
        }

        if (h.gpu.renderer) {
            el.appendChild(narrate(`Your GPU is ${val(h.gpu.renderer)}.`));
            if (h.gpuComment) {
                el.appendChild(comment(h.gpuComment));
            }
        }

        el.appendChild(narrate(
            `${val(h.cores + ' CPU cores' + maybefarbled)}${h.memory ? ` and ${val(h.memory + ' GB' + maybefarbled)} of RAM` : ''}.`
        ));

        // Disk size
        if (data.storage.diskEstimate) {
            const diskLabel = data.storage.diskEstimate >= 1024
                ? `${data.storage.diskEstimate / 1024} TB` : `${data.storage.diskEstimate} GB`;
            el.appendChild(narrate(
                `Your disk is approximately ${val(diskLabel + maybefarbled)}.`
            ));
        }

        // Media devices
        const md = data.mediaDevices;
        if (md.available && (md.cameras || md.microphones)) {
            let deviceLine = '';
            const parts = [];
            if (md.cameras) parts.push(`${md.cameras} camera${md.cameras > 1 ? 's' : ''}`);
            if (md.microphones) parts.push(`${md.microphones} microphone${md.microphones > 1 ? 's' : ''}`);
            if (md.speakers) parts.push(`${md.speakers} audio output${md.speakers > 1 ? 's' : ''}`);
            deviceLine = `We can see you have ${val(parts.join(', '))}.`;
            el.appendChild(narrate(deviceLine));
            if (md.cameras || md.microphones > 1) {
                el.appendChild(comment('We didn\u2019t ask for camera or microphone permission. We can still count them.'));
            }
        }

        // Display refresh rate
        if (data.refreshRate.hz > 60) {
            el.appendChild(narrate(`Your display runs at ${val(data.refreshRate.label)}.`));
            if (data.refreshRate.comment) el.appendChild(comment(data.refreshRate.comment));
        } else {
            el.appendChild(narrate(`Display refresh rate: ${val(data.refreshRate.label)}.`));
        }

        // VM detection — but not if Brave is farbling values (false positive)
        if (data.vm.isVM && !data.privacyProtection?.isBrave) {
            el.appendChild(narrate(
                `You\u2019re running in a ${val('virtual machine')}. ` +
                `Signal: ${data.vm.signals[0]}.`
            ));
        }

        // Multi-monitor
        if (data.multiMonitor.isExtended) {
            el.appendChild(narrate(`You have ${val('multiple monitors')} connected.`));
        }

        if (h.gpu.extensions) {
            el.appendChild(aside(
                `WebGL exposes ${h.gpu.extensions} GPU extensions, texture limits of ${h.gpu.params.maxTextureSize?.toLocaleString()}px, ` +
                `and a max viewport of ${h.gpu.params.maxViewportDims ? h.gpu.params.maxViewportDims.join('\u00d7') : 'unknown'}. ` +
                `All of this is available to any website, instantly, without permission.`
            ));
        }
    }, 1100);

    // 04 — NETWORK
    queueSectionReveal('network', () => {
        const el = document.getElementById('network-content');
        const n = data.network;

        if (n.geo) {
            el.appendChild(narrate(
                `Your IP address is ${val(n.geo.query)}.`
            ));
            el.appendChild(narrate(
                `Your ISP is ${val(n.geo.isp)}${n.geo.org && n.geo.org !== n.geo.isp ? ` (${val(n.geo.org)})` : ''}.`
            ));
        }

        if (n.connection.effectiveType) {
            let connDesc = n.connection.effectiveType.toUpperCase();
            if (n.connection.downlink) {
                connDesc += `, ~${n.connection.downlink} Mbps`;
            }
            el.appendChild(narrate(`Connection: ${val(connDesc)}.`));
        }

        if (n.vpnLikely) {
            el.appendChild(createVPNCallout(n.vpnReason));
        } else if (n.geo) {
            el.appendChild(narrate(
                `You\u2019re <em>not</em> using a VPN, by the way. We checked \u2014 your timezone matches your IP location.`
            ));
        }

        // WebRTC STUN IP leak
        if (data.webrtc.publicIP) {
            const stunIP = data.webrtc.publicIP;
            const geoIP = n.geo?.query;
            if (geoIP && stunIP !== geoIP) {
                el.appendChild(narrate(
                    `Interesting \u2014 WebRTC reveals a different public IP: ${val(stunIP)}. ` +
                    `Your reported IP is ${val(geoIP)}. This can happen with proxies or certain VPN configurations.`
                ));
            }
        }
        if (data.webrtc.localIPs.length > 0) {
            el.appendChild(narrate(
                `Your local network IP is ${val(data.webrtc.localIPs[0])}. That\u2019s your private address, leaked via WebRTC.`
            ));
        }

        if (n.dnt) {
            el.appendChild(createDNTCallout());
        }

        el.appendChild(aside(
            'IP geolocation and a WebRTC STUN request are the only external calls this page makes. Everything else is detected locally in your browser.'
        ));
    }, 1400);

    // 05 — PREFERENCES
    queueSectionReveal('preferences', () => {
        const el = document.getElementById('preferences-content');
        const p = data.preferences;

        el.appendChild(narrate('This doesn\u2019t even require JavaScript.'));

        el.appendChild(divider());

        // Show each detected preference
        for (const inference of p.inferences) {
            if (inference.includes('health') || inference.includes('impairment') ||
                inference.includes('disability') || inference.includes('accessibility') ||
                inference.includes('vestibular')) {
                // Health-related — extra emphasis
                const div = document.createElement('div');
                div.className = `data-line stagger-${Math.min(p.inferences.indexOf(inference) + 1, 8)}`;
                div.innerHTML = `<div class="dnt-callout"><p class="data-narrative">${inference}</p></div>`;
                el.appendChild(div);
            } else {
                el.appendChild(narrate(inference));
            }
        }

        if (p.inferences.length === 0) {
            el.appendChild(narrate('Your preferences are set to defaults \u2014 but that\u2019s information too. It tells us you haven\u2019t changed them.'));
        }

        el.appendChild(divider());

        el.appendChild(comment(p.comment));

        // Ad blocker
        if (data.adBlocker.detected) {
            el.appendChild(narrate(
                `You have an ${val('ad blocker')} installed. We created a hidden element with ad-related CSS classes. It was blocked. ` +
                `Ironically, this makes you slightly more identifiable \u2014 most users don\u2019t run one.`
            ));
        } else {
            el.appendChild(narrate(
                `You don\u2019t appear to have an ad blocker. We checked by creating a hidden element with ad-related CSS classes.`
            ));
        }

        el.appendChild(aside(
            'CSS media queries were designed to help websites adapt their layout. But they also expose ' +
            'personal preferences, accessibility needs, and even health conditions. ' +
            'A site can detect these purely through CSS \u2014 no JavaScript, no permission, no way to opt out. ' +
            'They even work in email clients.'
        ));
    }, 1000);

    // 06 — FONTS
    queueSectionReveal('fonts', () => {
        const el = document.getElementById('fonts-content');
        const f = data.fonts;

        el.appendChild(narrate(
            `You have ${val(f.total + ' fonts')} installed.`
        ));

        if (f.fontComment) {
            el.appendChild(comment(f.fontComment));
        }

        el.appendChild(createFontGrid(f.detected, f.devFonts, f.adobeFonts, f.designFonts));

        el.appendChild(divider());

        el.appendChild(aside(
            'Font detection works by rendering text in each font and measuring pixel widths against a baseline. ' +
            'If the width changes, the font is installed. No permission needed. ' +
            `We just tested ${FONT_TEST_COUNT} fonts in milliseconds.`
        ));
    }, 1500);

    // 07 — CANVAS
    queueSectionReveal('canvas', () => {
        const el = document.getElementById('canvas-content');

        el.appendChild(narrate(
            'We just drew invisible shapes, text, and gradients on a hidden canvas element.'
        ));

        el.appendChild(narrate(
            'The exact pixels produced are unique to your browser, OS, GPU, and driver combination.'
        ));

        el.appendChild(narrate('This is your canvas fingerprint:'));

        el.appendChild(createHashDisplay(data.canvasHash));

        el.appendChild(comment(
            'This single hash identifies your device across the web. No cookies, no storage, no permission.'
        ));

        el.appendChild(divider());

        // Emoji fingerprint
        // Canvas pixel diff visualization
        const diff = data.canvasDiff;
        el.appendChild(narrate(
            `Out of ${val(diff.totalPixels.toLocaleString())} pixels, ${val(diff.uniquePixels.toLocaleString())} are fingerprint-relevant \u2014 ` +
            `anti-aliased edges and blended colors that render differently on your hardware.`
        ));

        // Show the diff image
        const diffDiv = document.createElement('div');
        diffDiv.className = 'data-line stagger-5';
        diffDiv.innerHTML = `
            <div class="canvas-diff-wrap">
                <div class="canvas-diff-pair">
                    <div>
                        <div class="canvas-diff-label">What we drew</div>
                        <img src="${diff.originalDataUrl}" class="canvas-diff-img" alt="Canvas rendering">
                    </div>
                    <div>
                        <div class="canvas-diff-label">Pixels that identify you</div>
                        <img src="${diff.diffDataUrl}" class="canvas-diff-img" alt="Unique pixels highlighted">
                    </div>
                </div>
            </div>
        `;
        el.appendChild(diffDiv);

        el.appendChild(divider());

        el.appendChild(narrate('We also rendered emojis to a separate canvas:'));
        el.appendChild(createHashDisplay(data.emojiHash, true));
        el.appendChild(comment(
            'Different operating systems render emojis differently at the pixel level. ' +
            'Apple, Google, Samsung, and Windows all have unique emoji designs \u2014 even the exact anti-aliasing differs. ' +
            'Your emoji hash is another unique identifier.'
        ));

        el.appendChild(divider());

        // Audio fingerprint (folded into canvas section)
        el.appendChild(narrate(
            'We also played a silent audio signal through your browser\u2019s audio stack and measured the output.'
        ));

        if (data.audio.sum !== 'unavailable') {
            el.appendChild(narrate('Your audio fingerprint:'));
            el.appendChild(createHashDisplay(
                data.audio.sum + (data.audio.sampleRate ? ` @ ${data.audio.sampleRate}Hz` : ''),
                true
            ));
            el.appendChild(comment(
                'Same idea as canvas: your audio hardware processes signals in a unique, measurable way.'
            ));
        } else {
            el.appendChild(comment('Your browser blocked AudioContext fingerprinting. Good.'));
        }

        el.appendChild(aside(
            `Canvas fingerprinting works because different hardware and software render identical drawing instructions ` +
            `in subtly different ways \u2014 anti-aliasing, sub-pixel rendering, color management. ` +
            `The differences are invisible to you but consistent and measurable.`
        ));
    }, 1300);

    // 08 — GOING DEEPER
    queueSectionReveal('deeper', () => {
        const el = document.getElementById('deeper-content');

        el.appendChild(narrate('Everything above was the basics. Here\u2019s what gets really interesting.'));

        el.appendChild(divider());

        // WASM timing fingerprint
        if (data.wasmTiming.available) {
            el.appendChild(narrate(
                `We ran a WebAssembly timing test. Your WASM setter/call ratio is ${val(data.wasmTiming.ratio?.toFixed(2))}. ` +
                `This ratio is unique to your JavaScript engine and varies measurably between browsers.`
            ));
            el.appendChild(comment(
                'Research has shown that WASM interop timing can distinguish between browser engines even when the User-Agent is spoofed. ' +
                'The performance characteristics of the JS-to-WASM bridge are an engine-level fingerprint.'
            ));
        }

        // ClientRects sub-pixel
        if (data.clientRects.rects.length > 0) {
            const r = data.clientRects.rects[0];
            el.appendChild(narrate(
                `We measured text rendering at sub-pixel precision. The sentence "The quick brown fox\u2026" ` +
                `renders at exactly ${val(r.w.toFixed(6) + ' \u00d7 ' + r.h.toFixed(6))} pixels on your system.`
            ));
            el.appendChild(comment(
                'Those six decimal places are a fingerprint. Different font rasterizers, GPUs, and OS text rendering ' +
                'produce subtly different sub-pixel results. Blocking this would break every website\u2019s layout.'
            ));
        }

        el.appendChild(divider());

        // WebGPU
        if (data.webgpu.available) {
            el.appendChild(narrate(
                `Your browser supports ${val('WebGPU')} \u2014 the successor to WebGL. ` +
                `It exposes ${val(data.webgpu.features.length + ' GPU features')} and detailed hardware limits.`
            ));
            if (data.webgpu.adapterInfo?.architecture) {
                el.appendChild(narrate(
                    `GPU architecture: ${val(data.webgpu.adapterInfo.architecture)}. ` +
                    (data.webgpu.adapterInfo.device ? `Device: ${val(data.webgpu.adapterInfo.device)}.` : '')
                ));
            }
            el.appendChild(comment(
                'Recent research (WebGPU-SPY, 2024) showed that WebGPU compute shaders can fingerprint your specific physical GPU chip \u2014 ' +
                'not just the model, but the exact silicon, via manufacturing-level differences. ' +
                'It can also spy on which websites you\u2019re visiting by observing GPU cache patterns. Up to 90% precision.'
            ));
        }

        // Keyboard layout
        if (data.keyboardLayout.available && data.keyboardLayout.layout) {
            el.appendChild(narrate(
                `Your keyboard layout is ${val(data.keyboardLayout.layout)}.`
            ));
            if (data.keyboardLayout.comment) {
                el.appendChild(comment(data.keyboardLayout.comment));
            }
        }

        // Extensions
        if (data.extensions.available && data.extensions.detected.length > 0) {
            el.appendChild(divider());
            el.appendChild(narrate(
                `We detected ${val(data.extensions.detected.length + ' browser extension' + (data.extensions.detected.length > 1 ? 's' : ''))}: ` +
                `${data.extensions.detected.map(e => val(e)).join(', ')}.`
            ));
            el.appendChild(comment(
                'Extensions expose "web-accessible resources" \u2014 internal files that any website can try to load. ' +
                'If the file loads, the extension is installed. With just 2 detected extensions, ' +
                'there\u2019s a high probability of uniquely identifying you (77.5% in one study).'
            ));
        } else if (data.extensions.available) {
            el.appendChild(narrate('We probed for 12 popular Chrome extensions. None were detected \u2014 or their resources are hidden.'));
        }

        // TLS/JA4 explanation
        el.appendChild(divider());
        el.appendChild(narrate(
            `There\u2019s one more fingerprint we can\u2019t show you here, because it happens below the browser: your ${val('TLS fingerprint')}.`
        ));
        el.appendChild(comment(
            'Every HTTPS connection starts with a TLS "ClientHello" handshake. The specific cipher suites, extensions, ' +
            'and their order create a fingerprint called JA4. It identifies your exact browser and version. ' +
            'Cloudflare, AWS, and Akamai all use it. You cannot prevent it \u2014 it\u2019s part of how HTTPS works. ' +
            'If this page were deployed on a real server, we could show you yours.'
        ));

        // HTTP/2 note
        el.appendChild(aside(
            'Similarly, different browsers send HTTP/2 headers in a different order: Chrome sends method-authority-scheme-path, ' +
            'Firefox sends method-path-authority-scheme, Safari sends method-scheme-path-authority. ' +
            'This alone identifies your browser at the protocol level, invisibly, on every request.'
        ));
    }, 1500);

    // 09 — YOUR BEHAVIOR
    queueSectionReveal('behavior', () => {
        const el = document.getElementById('behavior-content');
        const stats = data.behaviorTracker.getStats();

        el.appendChild(narrate(
            `You\u2019ve been on this page for ${val(stats.elapsed + ' seconds')}.`
        ));

        if (stats.totalMouseDistance > 0) {
            el.appendChild(narrate(
                `Your mouse has traveled ${val(stats.totalMouseDistance.toLocaleString() + ' pixels')}.`
            ));
            el.appendChild(narrate(
                `Peak mouse speed: ${val(stats.maxMouseSpeed + ' px/ms')}. ` +
                `Average: ${val(stats.avgMouseSpeed + ' px/ms')}.`
            ));
        } else {
            el.appendChild(narrate(
                'You haven\u2019t moved your mouse \u2014 you\u2019re on a touchscreen, or you\u2019re very still.'
            ));
        }

        if (stats.scrollDirectionChanges > 0) {
            el.appendChild(narrate(
                `You changed scroll direction ${val(stats.scrollDirectionChanges + ' times')}. ` +
                (stats.scrollDirectionChanges > 10 ? 'You\u2019re a re-reader. Thorough.' :
                 stats.scrollDirectionChanges <= 2 ? 'Straight through. Decisive.' :
                 'A normal amount of back-and-forth.')
            ));
        }

        if (stats.longestSection && stats.longestTime) {
            const sectionNames = {
                basics: 'The Basics', device: 'Your Device', hardware: 'Your Hardware',
                network: 'Your Network', preferences: 'Your Preferences', fonts: 'Your Fonts',
                canvas: 'Canvas Fingerprint', deeper: 'Going Deeper',
                behavior: 'Your Behavior', fingerprint: 'Your Fingerprint',
                profile: 'Your Profile',
            };
            const name = sectionNames[stats.longestSection] || stats.longestSection;
            el.appendChild(narrate(
                `You spent the most time on ${val(name)} \u2014 ${val(stats.longestTime + 's')}. ${
                    stats.longestSection === 'hardware' ? 'Impressed by your own specs?' :
                    stats.longestSection === 'network' ? 'Worried about your network exposure?' :
                    stats.longestSection === 'preferences' ? 'The health data part was unsettling, wasn\u2019t it?' :
                    stats.longestSection === 'fonts' ? 'A lot of fonts to look through.' :
                    'Something caught your eye.'
                }`
            ));
        }

        // Reading speed
        const readingResult = data.readingTracker.calculate(stats.sectionDurations);
        if (readingResult) {
            el.appendChild(narrate(
                `Your reading speed: approximately ${val(readingResult.wpm + ' words per minute')}.`
            ));
            el.appendChild(comment(readingResult.comment));
        }

        // Tab switches
        const tabSwitches = data.tabTracker.switches;
        if (tabSwitches > 0) {
            el.appendChild(narrate(
                `You switched away from this tab ${val(tabSwitches + ' time' + (tabSwitches > 1 ? 's' : ''))}. ` +
                `${tabSwitches >= 3 ? 'Distracted? Or checking something we said?' :
                   tabSwitches === 1 ? 'Just once \u2014 quick peek at something else.' :
                   'A couple of detours.'}`
            ));
            if (data.tabTracker.totalHiddenTime > 1000) {
                el.appendChild(narrate(
                    `You spent ${val((data.tabTracker.totalHiddenTime / 1000).toFixed(1) + 's')} away from this page.`
                ));
            }
        } else {
            el.appendChild(narrate('You haven\u2019t switched away from this tab once. Focused.'));
        }

        el.appendChild(divider());

        el.appendChild(comment(
            'We\u2019ve been tracking every mouse movement, scroll, and pause since you clicked Start. ' +
            'Your mouse movement patterns can be nearly as identifying as a device fingerprint. Companies call this "behavioral biometrics" ' +
            'and use it to identify you across sessions \u2014 even after you clear your cookies and change your VPN.'
        ));

        el.appendChild(aside(
            'Keystroke dynamics, mouse movement patterns, and scroll behavior research in controlled settings has achieved over 99% accuracy at identifying individuals. ' +
            'Services like BioCatch and TypingDNA sell this commercially. Every interactive element on a website can be a sensor.'
        ));
    }, 800);

    // 10 — YOUR FINGERPRINT
    queueSectionReveal('fingerprint', () => {
        const el = document.getElementById('fingerprint-content');

        el.appendChild(narrate(
            'Now we combine everything into a single identifier.'
        ));

        const fp = createFingerprintDisplay(data.fingerprintHash);
        el.appendChild(fp.container);

        // Reveal hash characters after a beat
        setTimeout(() => fp.reveal(), 600);

        const e = data.entropy;
        el.appendChild((() => {
            const div = document.createElement('div');
            div.className = 'uniqueness-stat';
            const formatted = formatHugeNumber(e.totalUniqueness);
            div.innerHTML = `This fingerprint is unique among approximately <strong>1 in ${formatted}</strong> devices.`;
            return div;
        })());

        el.appendChild(comment(scaleComparison(e.totalUniqueness)));

        el.appendChild(comment(
            `${e.totalBits.toFixed(0)} bits of entropy. These are approximate estimates based on published research.`
        ));

        el.appendChild(divider());

        el.appendChild(narrate('Here\u2019s how each signal narrows you down:'));

        el.appendChild(createEntropyTable(e.rows, e.totalBits, e.totalUniqueness));

        el.appendChild(aside(
            'Ad networks use techniques like these to follow you across every website you visit \u2014 even after you clear your cookies. ' +
            'They call it "stateless tracking." You are never truly anonymous.'
        ));

        // --- STABILITY ANALYSIS ---
        el.appendChild(divider());

        const stability = analyzeStability(data);

        el.appendChild(narrate(
            `But what if things change? What if you travel, plug in a monitor, or use a VPN?`
        ));

        el.appendChild(narrate(
            `Of the ${val(stability.totalCount + ' signals')} we collected, ` +
            `${val(stability.stableCount + ' are hardware-locked')} \u2014 they never change unless you replace your machine. ` +
            `${val(stability.semiCount + ' are semi-stable')} \u2014 they change rarely. ` +
            `Only ${val(stability.volatileCount + ' are volatile')}.`
        ));

        // Stable-only uniqueness
        const stableFormatted = formatHugeNumber(stability.stableUniqueness);
        el.appendChild(narrate(
            `Using <em>only</em> the hardware-locked signals \u2014 ignoring your IP, timezone, screen, and everything that changes \u2014 ` +
            `you\u2019re still unique among ${val(stableFormatted)}.`
        ));

        el.appendChild(comment(
            `${stability.stableBits} bits of entropy from signals that survive reboots, travel, VPNs, and incognito mode. ` +
            `Your GPU, canvas hash, audio hash, fonts, and CPU characteristics don\u2019t lie.`
        ));

        // Scenarios
        el.appendChild(divider());
        el.appendChild(narrate('Here\u2019s what happens when things change:'));

        const scenarioList = document.createElement('div');
        scenarioList.className = 'data-line stagger-6';

        let scenarioHTML = '';
        for (const s of stability.scenarios) {
            const pct = Math.round((s.surviving / stability.totalBits) * 100);
            const barWidth = Math.max(pct, 5);
            scenarioHTML += `
                <div class="scenario-row">
                    <div class="scenario-name">${s.name}</div>
                    <div class="scenario-bar-track">
                        <div class="scenario-bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                    <div class="scenario-pct">${pct}%</div>
                    <div class="scenario-lost">Lost: ${s.lost}</div>
                </div>
            `;
        }
        scenarioList.innerHTML = scenarioHTML;
        el.appendChild(scenarioList);

        el.appendChild(comment(
            'Fingerprint matching isn\u2019t hash equality. It\u2019s probabilistic. ' +
            'If 70% of your signals match, it\u2019s almost certainly you. ' +
            'Clearing cookies, using incognito, even switching VPNs \u2014 none of it changes your hardware. ' +
            'Only switching to a completely different device breaks the link, and even then, ' +
            'your IP and timezone can reconnect you at the household level.'
        ));
    }, 1800);

    // 11 — YOUR PROFILE
    queueSectionReveal('profile', () => {
        const el = document.getElementById('profile-content');
        const profile = buildProfile(data);

        // The narrative — a paragraph that reads like a surveillance dossier
        const narrativeDiv = document.createElement('div');
        narrativeDiv.className = 'data-line stagger-1';
        narrativeDiv.innerHTML = `<div class="profile-narrative">${profile.narrative}</div>`;
        el.appendChild(narrativeDiv);

        // Hardware cost estimate
        if (profile.hardwareCost.low > 0) {
            el.appendChild(createProfileCard('Estimated hardware cost', [profile.cards.estimatedCost]));
        }

        // Cultural signals
        if (profile.culturalSignals.length > 0) {
            el.appendChild(createProfileCard('Cultural signals', profile.culturalSignals));
        }

        // Voice languages
        if (profile.voiceLanguages.languages.length > 1) {
            el.appendChild(createProfileCard('Installed voice languages', profile.voiceLanguages.languages));
        }

        el.appendChild(divider());

        el.appendChild(comment(
            'No single signal reveals much. But combined, they paint a detailed picture. ' +
            'Ad networks, data brokers, and intelligence agencies build profiles like this automatically, at scale, in real time.'
        ));
    }, 1200);

    // PUNCHLINE
    queueSectionReveal('punchline', () => {
        const el = document.getElementById('punchline-content');

        resetStagger();

        const p1 = document.createElement('div');
        p1.className = 'data-line stagger-1';
        p1.innerHTML = '<p class="punchline-text">None of this required a cookie.</p>';
        el.appendChild(p1);

        const p2 = document.createElement('div');
        p2.className = 'data-line stagger-2';
        p2.innerHTML = '<p class="punchline-text">None of it required your permission.</p>';
        el.appendChild(p2);

        const p3 = document.createElement('div');
        p3.className = 'data-line stagger-3';
        p3.innerHTML = '<p class="punchline-sub">Every website you visit has access to all of this, right now.</p>';
        el.appendChild(p3);
    }, 600);

    // WHAT YOU CAN DO
    queueSectionReveal('protect', () => {
        const el = document.getElementById('protect-content');

        el.appendChild(narrate('But it doesn\u2019t have to be this way.'));

        const list = document.createElement('ul');
        list.className = 'protect-list';

        const tips = [
            {
                title: 'Firefox with resistFingerprinting',
                desc: 'Firefox\u2019s <code>privacy.resistFingerprinting</code> flag normalizes most of these signals \u2014 screen size, timezone, fonts, canvas \u2014 making you blend in with other Firefox users.',
            },
            {
                title: 'Brave Browser',
                desc: 'Brave randomizes canvas and audio fingerprints on every session, and blocks known fingerprinting scripts by default.',
            },
            {
                title: 'Tor Browser',
                desc: 'The gold standard. All Tor users share identical fingerprints by design. But expect slower browsing.',
            },
            {
                title: 'uBlock Origin + Canvas Blocker',
                desc: 'uBlock blocks fingerprinting scripts before they run. Canvas Blocker adds noise to canvas and font readouts. Both are free.',
            },
            {
                title: 'Private browsing doesn\u2019t help',
                desc: 'Incognito mode clears cookies and history. It does nothing about fingerprinting. Your device looks exactly the same in a private window.',
            },
        ];

        tips.forEach((tip, i) => {
            const li = document.createElement('li');
            li.className = 'protect-item';
            li.style.animationDelay = `${i * 0.1}s`;
            li.innerHTML = `
                <div class="protect-item-title">${tip.title}</div>
                <p class="protect-item-desc">${tip.desc}</p>
            `;
            list.appendChild(li);
        });

        el.appendChild(list);
    }, 400);

    // CLOSING
    queueSectionReveal('closing', () => {
        const el = document.getElementById('closing-content');

        // Count total signals
        const signalCount = countSignals();

        const s1 = document.createElement('div');
        s1.className = 'data-line stagger-1';
        s1.innerHTML = `<p class="closing-stat">This page collected <strong>${signalCount}+ signals</strong> about you in under <strong>2 seconds</strong>.</p>`;
        el.appendChild(s1);

        const s2 = document.createElement('div');
        s2.className = 'data-line stagger-2';
        s2.innerHTML = '<p class="closing-stat">It didn\u2019t store any of it.</p>';
        el.appendChild(s2);

        const s3 = document.createElement('div');
        s3.className = 'data-line stagger-3';
        s3.innerHTML = '<p class="closing-kicker">Most websites do the same thing, and they keep everything.</p>';
        el.appendChild(s3);

        // LLM prompt block
        const behaviorStats = data.behaviorTracker.getStats();
        const profile = buildProfile(data);
        const prompt = generateLLMPrompt(data, behaviorStats, profile, data.entropy);

        const llmWrap = document.createElement('div');
        llmWrap.className = 'llm-block-wrap data-line stagger-4';
        llmWrap.innerHTML = `
            <p class="llm-block-label">Curious what an AI would infer about you? Copy this and paste it into any LLM:</p>
            <div class="llm-block" id="llm-prompt"></div>
            <button class="llm-copy-btn" id="llm-copy-btn">Copy to clipboard</button>
        `;
        el.appendChild(llmWrap);

        // Set prompt text content (not innerHTML to avoid XSS from user data)
        requestAnimationFrame(() => {
            const promptEl = document.getElementById('llm-prompt');
            if (promptEl) promptEl.textContent = prompt;

            const copyBtn = document.getElementById('llm-copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(prompt).then(() => {
                        copyBtn.textContent = 'Copied!';
                        copyBtn.classList.add('copied');
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy to clipboard';
                            copyBtn.classList.remove('copied');
                        }, 2000);
                    }).catch(() => {
                        // Fallback for HTTP or restricted contexts
                        const textarea = document.createElement('textarea');
                        textarea.value = prompt;
                        textarea.style.cssText = 'position:fixed;left:-9999px;';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        copyBtn.textContent = 'Copied!';
                        copyBtn.classList.add('copied');
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy to clipboard';
                            copyBtn.classList.remove('copied');
                        }, 2000);
                    });
                });
            }
        });

        const joke = document.createElement('div');
        joke.className = 'closing-joke';
        joke.innerHTML = 'Oh, and we also added Google Analytics to this page. Just kidding.';
        el.appendChild(joke);
    }, 400);
}

function scaleComparison(n) {
    // Return a human-scale analogy for a large number.
    // Each comparison is factually accurate and chosen so n exceeds it.
    // One analogy per -illion prefix for clean coverage.
    // Each analogy is factually verified. One per -illion, each unique.
    if (n >= 1e30) return `For scale: there are about 7 octillion atoms in a human body. Your fingerprint space is even larger.`;              // nonillion
    if (n >= 1e27) return `For scale: there are about 7 octillion atoms in a human body. Your fingerprint space is in that range.`;            // octillion (7e27)
    if (n >= 1e24) return `For scale: there are about 200 sextillion stars in the observable universe. Your fingerprint space exceeds that.`;  // septillion (2e23)
    if (n >= 1e21) return `For scale: a single drop of water contains about 1.5 sextillion molecules. Your fingerprint space is in that range.`;  // sextillion (1.5e21)
    if (n >= 1e18) return `For scale: there are about 7.5 quintillion grains of sand on Earth. Your fingerprint space is in that range.`;      // quintillion (7.5e18)
    if (n >= 1e15) return `For scale: there are about 100 trillion synapses in the human brain. Your fingerprint space exceeds that.`;         // quadrillion (1e14)
    if (n >= 1e12) return `For scale: there are about 3.5 trillion fish in the ocean. Your fingerprint space exceeds that.`;                   // trillion (3.5e12)
    if (n >= 1e9) return `For scale: there are about 8.3 billion people on Earth. Your fingerprint space is well beyond that.`;                // billion
    if (n >= 1e6) return `For scale: there are about 8 million species on Earth. Your fingerprint space exceeds that.`;                        // million
    return '';
}

function createProfileCard(label, items) {
    const div = document.createElement('div');
    div.className = 'data-line stagger-' + Math.min(Math.floor(Math.random() * 5) + 1, 8);
    div.innerHTML = `
        <div class="profile-card">
            <div class="profile-card-label">${label}</div>
            <div class="profile-card-value">
                ${items.length === 1
                    ? items[0]
                    : '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>'
                }
            </div>
        </div>
    `;
    return div;
}

function countSignals() {
    let count = 0;
    // Basics: tz, locale, languages, time
    count += 4;
    // Device: os, browser, screen(6), touch(2), ua, platform, vendor
    count += 12;
    // Hardware: cores, memory, gpu(renderer, vendor, extensions, 3 params)
    count += 8;
    // Network: ip, city, country, isp, org, connection(4), vpn, dnt
    count += 11;
    // Fonts
    count += data.fonts?.total || 0;
    // Canvas
    count += 1;
    // Audio
    count += 2;
    // Misc: math(3), storage, battery, plugins, voices, keyboard
    count += 8;
    // Preferences: darkMode, reducedMotion, highContrast, forcedColors, etc.
    count += 8;
    // Media devices: cameras, mics, speakers
    count += 3;
    // Multi-monitor, disk, webrtc
    count += 3;
    // Behavior: mouse, scroll, time
    count += 5;
    return count;
}

// Expose font test count for the fonts section aside
const FONT_TEST_COUNT = 248; // Matches the FONT_LIST length in detect.js
