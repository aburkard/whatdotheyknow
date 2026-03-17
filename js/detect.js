// ============================================
// detect.js — All browser fingerprinting logic
// ============================================

// --- BASICS ---

export function detectBasics() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language;
    const languages = [...(navigator.languages || [locale])];
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    // Primary language display name
    let languageName = locale;
    try {
        const dn = new Intl.DisplayNames([locale], { type: 'language' });
        languageName = dn.of(locale);
    } catch (e) {}

    return { tz, locale, languages, languageName, time, date };
}

// --- DEVICE ---

export function detectDevice() {
    const ua = navigator.userAgent;
    const platform = navigator.platform || '';
    const vendor = navigator.vendor || '';

    // OS
    let os = 'Unknown';
    let osVersion = '';
    if (/Mac OS X/.test(ua)) {
        os = 'macOS';
        const m = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        if (m) osVersion = m[1].replace(/_/g, '.');
    } else if (/Windows NT/.test(ua)) {
        os = 'Windows';
        const m = ua.match(/Windows NT (\d+\.\d+)/);
        if (m) {
            const v = { '10.0': '10+', '6.3': '8.1', '6.2': '8', '6.1': '7' };
            osVersion = v[m[1]] || m[1];
        }
    } else if (/Android/.test(ua)) {
        os = 'Android';
        const m = ua.match(/Android (\d+\.?\d*)/);
        if (m) osVersion = m[1];
    } else if (/iPhone|iPad|iPod/.test(ua)) {
        os = 'iOS';
        const m = ua.match(/OS (\d+_\d+)/);
        if (m) osVersion = m[1].replace('_', '.');
    } else if (/CrOS/.test(ua)) {
        os = 'ChromeOS';
    } else if (/Linux/.test(ua)) {
        os = 'Linux';
    }

    // Browser
    let browser = 'Unknown';
    let browserVersion = '';
    if (/Firefox\/(\d+)/.test(ua)) {
        browser = 'Firefox';
        browserVersion = ua.match(/Firefox\/(\d+)/)[1];
    } else if (/Edg\/(\d+)/.test(ua)) {
        browser = 'Edge';
        browserVersion = ua.match(/Edg\/(\d+)/)[1];
    } else if (/OPR\/(\d+)/.test(ua)) {
        browser = 'Opera';
        browserVersion = ua.match(/OPR\/(\d+)/)[1];
    } else if (/Chrome\/(\d+)/.test(ua) && !/Edg/.test(ua)) {
        browser = 'Chrome';
        browserVersion = ua.match(/Chrome\/(\d+)/)[1];
    } else if (/Safari\//.test(ua) && /Version\/(\d+)/.test(ua)) {
        browser = 'Safari';
        browserVersion = ua.match(/Version\/(\d+)/)[1];
    }

    // Screen
    const screen = {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
    };

    // Touch
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    // Device guess
    let deviceGuess = '';
    if (os === 'macOS') {
        if (screen.pixelRatio === 2) {
            if (screen.width <= 1440 && screen.width >= 1400) deviceGuess = 'a MacBook Pro 14"';
            else if (screen.width >= 1680 && screen.width <= 1728) deviceGuess = 'a MacBook Pro 16"';
            else if (screen.width === 1512) deviceGuess = 'a MacBook Pro 14"';
            else if (screen.width === 1470) deviceGuess = 'a MacBook Air 15"';
            else if (screen.width <= 1280) deviceGuess = 'a MacBook Air 13"';
        }
        if (screen.width >= 2560) deviceGuess = 'a Mac with an external display';
    } else if (os === 'iOS') {
        if (screen.width === 430 || screen.width === 428) deviceGuess = 'an iPhone Pro Max';
        else if (screen.width === 393) deviceGuess = 'an iPhone Pro';
        else if (screen.width === 390) deviceGuess = 'an iPhone';
        else if (screen.width >= 768) deviceGuess = 'an iPad';
    } else if (os === 'Windows' && touchSupport && screen.width >= 2000) {
        deviceGuess = 'a high-res Windows laptop or tablet';
    }

    return { os, osVersion, browser, browserVersion, screen, touchSupport, maxTouchPoints, deviceGuess, ua, platform, vendor };
}

// --- HARDWARE ---

export function detectHardware() {
    const cores = navigator.hardwareConcurrency || null;
    const memory = navigator.deviceMemory || null;

    // WebGL GPU
    let gpu = { renderer: null, vendor: null, extensions: 0, params: {} };
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
        if (gl) {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
                gpu.renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                gpu.vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
            }
            gpu.extensions = gl.getSupportedExtensions()?.length || 0;
            gpu.params = {
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
                maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
            };
        }
    } catch (e) {}

    // GPU commentary
    let gpuComment = '';
    const r = (gpu.renderer || '').toLowerCase();
    if (/rtx\s*40/.test(r)) gpuComment = 'Top-tier gaming GPU. Nice rig.';
    else if (/rtx\s*30/.test(r)) gpuComment = 'Solid gaming GPU. Still holds up.';
    else if (/rtx/.test(r)) gpuComment = 'NVIDIA RTX. You game, or you do 3D work.';
    else if (/gtx/.test(r)) gpuComment = 'NVIDIA GTX. An older card, but still kicking.';
    else if (/radeon/.test(r)) gpuComment = 'AMD Radeon. Interesting choice.';
    else if (/apple m\d/.test(r)) gpuComment = 'Apple silicon. Unified memory architecture.';
    else if (/apple gpu/.test(r)) gpuComment = 'Apple GPU. Mobile silicon.';
    else if (/intel/.test(r) && /iris/.test(r)) gpuComment = 'Intel Iris. Integrated graphics \u2014 probably a laptop.';
    else if (/intel/.test(r) && /uhd/.test(r)) gpuComment = 'Intel UHD. Integrated graphics \u2014 no dedicated GPU.';
    else if (/intel/.test(r)) gpuComment = 'Intel integrated graphics. Not built for gaming.';
    else if (/mali/.test(r)) gpuComment = 'ARM Mali GPU. You\u2019re on a mobile device.';
    else if (/adreno/.test(r)) gpuComment = 'Qualcomm Adreno. Mobile GPU.';
    else if (/swiftshader/.test(r)) gpuComment = 'Software renderer. Your GPU is hidden or unavailable.';

    return { cores, memory, gpu, gpuComment };
}

// --- NETWORK ---

export async function detectNetwork() {
    let geo = null;

    // Primary: ipinfo.io — HTTPS, 50k/month free tier
    try {
        const res = await fetch('https://ipinfo.io/json');
        if (res.ok) {
            const d = await res.json();
            geo = {
                query: d.ip,
                city: d.city,
                regionName: d.region,
                country: d.country,
                zip: d.postal,
                timezone: d.timezone,
                isp: d.org,
                org: d.org,
            };
        }
    } catch (e) {}

    // Fallback: ipapi.co
    if (!geo) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const d = await res.json();
                geo = {
                    query: d.ip,
                    city: d.city,
                    regionName: d.region,
                    country: d.country_name,
                    zip: d.postal,
                    timezone: d.timezone,
                    isp: d.org,
                    org: d.org,
                };
            }
        } catch (e) {}
    }

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let connection = {};
    if (conn) {
        connection = {
            effectiveType: conn.effectiveType,
            downlink: conn.downlink,
            rtt: conn.rtt,
            saveData: conn.saveData || false,
        };
    }

    // VPN detection
    let vpnLikely = false;
    let vpnReason = '';
    if (geo?.timezone) {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (geo.timezone !== browserTz) {
            vpnLikely = true;
            vpnReason = `Your browser says ${browserTz}, but your IP says ${geo.timezone}.`;
        }
    }

    // DNT
    const dnt = navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes';

    return { geo, connection, vpnLikely, vpnReason, dnt };
}

// --- FONTS ---

const FONT_LIST = [
    'Adobe Arabic', 'Adobe Caslon Pro', 'Adobe Devanagari', 'Adobe Fan Heiti Std',
    'Adobe Fangsong Std', 'Adobe Garamond Pro', 'Adobe Gothic Std', 'Adobe Hebrew',
    'Adobe Heiti Std', 'Adobe Kaiti Std', 'Adobe Ming Std', 'Adobe Myungjo Std',
    'Adobe Song Std', 'Al Bayan', 'Al Nile', 'Al Tarikh', 'American Typewriter',
    'Andale Mono', 'Apple Braille', 'Apple Chancery', 'Apple Color Emoji',
    'Apple SD Gothic Neo', 'AppleGothic', 'AppleMyungjo', 'Arial', 'Arial Black',
    'Arial Hebrew', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS',
    'Avenir', 'Avenir Next', 'Avenir Next Condensed', 'Ayuthaya',
    'Baghdad', 'Bangla MN', 'Bangla Sangam MN', 'Baskerville', 'Beirut',
    'Big Caslon', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps',
    'Bodoni Ornaments', 'Book Antiqua', 'Bookman Old Style', 'Bradley Hand',
    'Brush Script MT', 'Calibri', 'Cambria', 'Cambria Math', 'Candara',
    'Canela', 'Cascadia Code', 'Cascadia Mono', 'Century Gothic', 'Century Schoolbook',
    'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charter', 'Cochin', 'Comic Sans MS',
    'Consolas', 'Constantia', 'Copperplate', 'Corbel', 'Corsiva Hebrew',
    'Courier', 'Courier New', 'Damascus', 'Dank Mono', 'DejaVu Sans',
    'DejaVu Sans Mono', 'DejaVu Serif', 'Devanagari MT', 'Devanagari Sangam MN',
    'Didot', 'DIN Alternate', 'DIN Condensed', 'Diwan Kufi', 'Diwan Thuluth',
    'Droid Sans', 'Droid Sans Mono', 'Droid Serif', 'Euphemia UCAS',
    'Farah', 'Farisi', 'Fira Code', 'Fira Mono', 'Fira Sans', 'Franklin Gothic Medium',
    'Futura', 'Galvji', 'Garamond', 'Geeza Pro', 'Geneva', 'Georgia',
    'Gill Sans', 'Grantha Sangam MN', 'Gujarati MT', 'Gujarati Sangam MN',
    'Gurmukhi MN', 'Gurmukhi MT', 'Gurmukhi Sangam MN', 'Hack', 'Haettenschweiler',
    'Hasklig', 'Heiti SC', 'Heiti TC', 'Helvetica', 'Helvetica Neue',
    'Herculanum', 'Hiragino Kaku Gothic Pro', 'Hiragino Maru Gothic Pro',
    'Hiragino Mincho Pro', 'Hiragino Sans', 'Hoefler Text', 'IBM Plex Mono',
    'IBM Plex Sans', 'Impact', 'InaiMathi', 'Inconsolata', 'Iowan Old Style',
    'JetBrains Mono', 'Kailasa', 'Kannada MN', 'Kannada Sangam MN',
    'Kefa', 'Khmer MN', 'Khmer Sangam MN', 'Kohinoor Bangla', 'Kohinoor Devanagari',
    'Kohinoor Gujarati', 'Kohinoor Telugu', 'Kokonor', 'Krungthep', 'KufiStandardGK',
    'Lao MN', 'Lao Sangam MN', 'Lato', 'Lucida Console', 'Lucida Grande',
    'Lucida Sans', 'Lucida Sans Unicode', 'Luminari', 'Malayalam MN',
    'Malayalam Sangam MN', 'Marker Felt', 'Menlo', 'Microsoft Sans Serif',
    'Mishafi', 'Mishafi Gold', 'Monaco', 'Mongolian Baiti', 'Mono',
    'Montserrat', 'Mshtakan', 'Mukta Mahee', 'Muna', 'Myanmar MN',
    'Myanmar Sangam MN', 'Myriad Pro', 'Nadeem', 'Nanum Gothic',
    'New Peninim MT', 'Noteworthy', 'Noto Sans', 'Noto Serif', 'Nunito',
    'Open Sans', 'Operator Mono', 'Optima', 'Oriya MN', 'Oriya Sangam MN',
    'Osaka', 'PT Mono', 'PT Sans', 'PT Serif', 'Palatino', 'Palatino Linotype',
    'Papyrus', 'Party LET', 'Phosphate', 'PingFang HK', 'PingFang SC',
    'PingFang TC', 'Plantagenet Cherokee', 'Poppins', 'Pragmata Pro', 'Raanana',
    'Raleway', 'Roboto', 'Roboto Mono', 'Rockwell', 'SF Compact', 'SF Mono',
    'SF Pro', 'SF Pro Display', 'SF Pro Rounded', 'SF Pro Text', 'STIXGeneral',
    'Samir', 'Sana', 'Sathu', 'Savoye LET', 'Segoe Print', 'Segoe Script',
    'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Shree Devanagari 714',
    'SignPainter', 'Silom', 'Sinhala MN', 'Sinhala Sangam MN', 'Skia',
    'Snell Roundhand', 'Songti SC', 'Songti TC', 'Source Code Pro', 'Source Sans Pro',
    'Source Serif Pro', 'Stencil', 'Sukhumvit Set', 'Superclarendon',
    'Symbol', 'Tahoma', 'Tamil MN', 'Tamil Sangam MN', 'Telugu MN',
    'Telugu Sangam MN', 'Thonburi', 'Times', 'Times New Roman', 'Tisa',
    'Trebuchet MS', 'Ubuntu', 'Ubuntu Mono', 'Verdana', 'Victor Mono',
    'Waseem', 'Webdings', 'Wingdings', 'Wingdings 2', 'Wingdings 3',
    'Zapf Dingbats', 'Zapfino',
];

const DEVELOPER_FONTS = new Set([
    'Cascadia Code', 'Cascadia Mono', 'Consolas', 'Dank Mono', 'DejaVu Sans Mono',
    'Fira Code', 'Fira Mono', 'Hack', 'Hasklig', 'IBM Plex Mono', 'Inconsolata',
    'JetBrains Mono', 'Menlo', 'Monaco', 'Mono', 'Operator Mono', 'Pragmata Pro',
    'PT Mono', 'Roboto Mono', 'SF Mono', 'Source Code Pro', 'Ubuntu Mono', 'Victor Mono',
]);

const ADOBE_FONTS = new Set([
    'Adobe Arabic', 'Adobe Caslon Pro', 'Adobe Devanagari', 'Adobe Fan Heiti Std',
    'Adobe Fangsong Std', 'Adobe Garamond Pro', 'Adobe Gothic Std', 'Adobe Hebrew',
    'Adobe Heiti Std', 'Adobe Kaiti Std', 'Adobe Ming Std', 'Adobe Myungjo Std',
    'Adobe Song Std', 'Myriad Pro',
]);

const DESIGN_FONTS = new Set([
    'Canela', 'Futura', 'Gill Sans', 'Avenir', 'Avenir Next', 'Didot',
    'Bodoni 72', 'Bodoni 72 Oldstyle', 'Garamond', 'Baskerville',
    'Helvetica Neue', 'Optima', 'Big Caslon',
]);

export function detectFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testStr = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Measure baseline widths
    const baseWidths = {};
    for (const base of baseFonts) {
        ctx.font = `${testSize} ${base}`;
        baseWidths[base] = ctx.measureText(testStr).width;
    }

    const detected = [];
    for (const font of FONT_LIST) {
        let isDetected = false;
        for (const base of baseFonts) {
            ctx.font = `${testSize} '${font}', ${base}`;
            const w = ctx.measureText(testStr).width;
            if (w !== baseWidths[base]) {
                isDetected = true;
                break;
            }
        }
        if (isDetected) detected.push(font);
    }

    // Categorize
    const devFonts = detected.filter(f => DEVELOPER_FONTS.has(f));
    const adobeFonts = detected.filter(f => ADOBE_FONTS.has(f));
    const designFonts = detected.filter(f => DESIGN_FONTS.has(f));

    // Commentary
    let fontComment = '';
    const hasDev = devFonts.length > 0;
    const hasAdobe = adobeFonts.length > 0;
    const hasDesign = designFonts.length >= 3;

    if (hasAdobe && hasDev) {
        fontComment = `You have Adobe fonts and developer fonts. Full-stack designer?`;
    } else if (hasAdobe) {
        fontComment = `Adobe fonts detected. You use Creative Suite.`;
    } else if (hasDev && devFonts.length >= 3) {
        fontComment = `${devFonts.length} developer fonts. You definitely write code.`;
    } else if (hasDev) {
        fontComment = `${devFonts.join(' and ')} \u2014 developer font${devFonts.length > 1 ? 's' : ''}. You code.`;
    } else if (hasDesign) {
        fontComment = `A curated font collection. You care about typography.`;
    }

    if (detected.length > 150) {
        fontComment += (fontComment ? ' ' : '') + `${detected.length} fonts. That\u2019s\u2026 a lot.`;
    } else if (detected.length < 30) {
        fontComment += (fontComment ? ' ' : '') + 'Minimal font collection. Stock install, or very disciplined.';
    }

    return { detected, devFonts, adobeFonts, designFonts, fontComment, total: detected.length };
}

// --- CANVAS FINGERPRINT ---

export function detectCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // Draw diverse shapes and text for maximum entropy
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint \ud83d\ude00', 2, 15);

    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '18px Times New Roman';
    ctx.fillText('whatdotheyknow', 4, 45);

    // Arc
    ctx.beginPath();
    ctx.arc(50, 100, 40, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = '#ff5733';
    ctx.fill();

    // Bezier
    ctx.beginPath();
    ctx.moveTo(170, 80);
    ctx.bezierCurveTo(130, 100, 200, 120, 160, 140);
    ctx.strokeStyle = '#3366cc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Gradient
    const grd = ctx.createLinearGradient(200, 0, 300, 150);
    grd.addColorStop(0, '#ff0000');
    grd.addColorStop(1, '#0000ff');
    ctx.fillStyle = grd;
    ctx.fillRect(200, 50, 90, 90);

    const dataUrl = canvas.toDataURL();
    return { dataUrl };
}

// --- AUDIO FINGERPRINT ---

export async function detectAudio() {
    try {
        const audioCtx = new OfflineAudioContext(1, 44100, 44100);
        const oscillator = audioCtx.createOscillator();
        const compressor = audioCtx.createDynamicsCompressor();

        oscillator.type = 'triangle';
        oscillator.frequency.value = 10000;

        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;

        oscillator.connect(compressor);
        compressor.connect(audioCtx.destination);
        oscillator.start(0);

        const rendered = await audioCtx.startRendering();
        const data = rendered.getChannelData(0);

        // Sum a slice of the audio buffer as fingerprint
        let sum = 0;
        for (let i = 4500; i < 5000; i++) {
            sum += Math.abs(data[i]);
        }

        return { sum: sum.toFixed(6), sampleRate: rendered.sampleRate };
    } catch (e) {
        return { sum: 'unavailable', sampleRate: null };
    }
}

// --- DISPLAY REFRESH RATE ---

export function detectRefreshRate() {
    return new Promise((resolve) => {
        const samples = [];
        let last = null;
        let count = 0;
        const target = 30;

        function frame(ts) {
            if (last !== null) {
                samples.push(ts - last);
            }
            last = ts;
            count++;
            if (count < target) {
                requestAnimationFrame(frame);
            } else {
                const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
                const hz = Math.round(1000 / avg);
                // Snap to common refresh rates
                let label;
                if (hz >= 135) label = '144Hz';
                else if (hz >= 110) label = '120Hz';
                else if (hz >= 85) label = '90Hz';
                else if (hz >= 55) label = '60Hz';
                else label = `${hz}Hz`;

                let comment = '';
                if (hz >= 110) comment = 'High refresh rate display \u2014 ProMotion MacBook, iPad Pro, or gaming monitor.';
                else if (hz >= 85) comment = '90Hz \u2014 likely a newer phone or tablet.';

                resolve({ hz, label, comment });
            }
        }
        requestAnimationFrame(frame);
    });
}

// --- AD BLOCKER DETECTION ---

export function detectAdBlocker() {
    return new Promise((resolve) => {
        const bait = document.createElement('div');
        bait.innerHTML = '&nbsp;';
        bait.className = 'adsbox ad-placement ad-banner textAd pub_300x250';
        bait.setAttribute('id', 'ad-test-element');
        Object.assign(bait.style, {
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '300px',
            height: '250px',
            overflow: 'hidden',
        });
        document.body.appendChild(bait);

        // Check after a brief delay for blockers to act
        setTimeout(() => {
            const blocked = bait.offsetHeight === 0 ||
                            bait.offsetWidth === 0 ||
                            bait.clientHeight === 0 ||
                            getComputedStyle(bait).display === 'none' ||
                            getComputedStyle(bait).visibility === 'hidden';
            document.body.removeChild(bait);
            resolve({ detected: blocked });
        }, 200);
    });
}

// --- TAB FOCUS TRACKING ---

export function createTabTracker() {
    const tracker = {
        switches: 0,
        totalHiddenTime: 0,
        lastHidden: null,
        isHidden: document.hidden,
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            tracker.switches++;
            tracker.lastHidden = performance.now();
            tracker.isHidden = true;
        } else {
            if (tracker.lastHidden) {
                tracker.totalHiddenTime += performance.now() - tracker.lastHidden;
            }
            tracker.isHidden = false;
        }
    });

    return tracker;
}

// --- EMOJI FINGERPRINT ---

export function detectEmojiFingerprint() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // Use a diverse set of emojis that render differently across platforms
    const emojis = '\ud83d\ude00\ud83d\ude0d\ud83e\udd2f\ud83d\udc4d\ud83c\udffb\ud83c\udf08\ud83d\udc68\u200d\ud83d\udcbb\ud83c\uddf9\ud83c\uddfc\ud83e\uddd1\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c\udf55\u2764\ufe0f\u200d\ud83d\udd25\ud83e\udee0';
    ctx.font = '32px serif';
    ctx.fillText(emojis, 0, 40);

    // Also test skin tone rendering
    ctx.font = '24px serif';
    ctx.fillText('\ud83d\udc4b\ud83d\udc4b\ud83c\udffb\ud83d\udc4b\ud83c\udffc\ud83d\udc4b\ud83c\udffd\ud83d\udc4b\ud83c\udffe\ud83d\udc4b\ud83c\udfff', 0, 72);

    return { dataUrl: canvas.toDataURL() };
}

// --- BROWSER ZOOM LEVEL ---

export function detectZoom() {
    const ratio = window.devicePixelRatio;
    const screenWidth = window.screen.width;
    const innerWidth = window.innerWidth;

    // On non-retina, zoom = devicePixelRatio
    // On retina, need to account for base ratio
    // outerWidth / innerWidth gives zoom in most browsers
    const outerInnerRatio = window.outerWidth / window.innerWidth;

    let zoom = Math.round(outerInnerRatio * 100);
    // Clamp to sensible values
    if (zoom < 25 || zoom > 500) zoom = 100;

    let comment = '';
    if (zoom > 110) comment = `Zoomed in to ${zoom}% \u2014 prefer larger text, or maybe a high-density display.`;
    else if (zoom < 90) comment = `Zoomed out to ${zoom}% \u2014 you like to see more on screen.`;

    return { zoom, comment };
}

// --- DOCK / TASKBAR INFERENCE ---

export function detectTaskbar() {
    const sw = screen.width;
    const sh = screen.height;
    const aw = screen.availWidth;
    const ah = screen.availHeight;

    const diffBottom = sh - ah - (screen.availTop || 0);
    const diffTop = screen.availTop || 0;
    const diffLeft = screen.availLeft || 0;
    const diffRight = sw - aw - diffLeft;

    let position = null;
    let size = 0;

    if (diffBottom > 10) { position = 'bottom'; size = sh - ah; }
    else if (diffTop > 10) { position = 'top'; size = diffTop; }
    else if (diffLeft > 10) { position = 'left'; size = diffLeft; }
    else if (diffRight > 10) { position = 'right'; size = diffRight; }

    let comment = '';
    if (position) {
        const isSmall = size < 50;
        if (position === 'bottom') comment = `Your taskbar/dock is at the ${position}${isSmall ? ' (auto-hidden or small)' : ''}.`;
        else if (position === 'left') comment = `Dock on the left \u2014 classic macOS power user move.`;
        else if (position === 'right') comment = `Dock on the right \u2014 that\u2019s unusual.`;
        else if (position === 'top') comment = `Menu bar or taskbar at the top.`;
    }

    return { position, size, comment };
}

// --- CODEC SUPPORT ---

export function detectCodecs() {
    const video = document.createElement('video');
    const codecs = {};

    const tests = {
        'H.264': 'video/mp4; codecs="avc1.42E01E"',
        'H.265/HEVC': 'video/mp4; codecs="hev1.1.6.L93.B0"',
        'VP8': 'video/webm; codecs="vp8"',
        'VP9': 'video/webm; codecs="vp9"',
        'AV1': 'video/mp4; codecs="av01.0.01M.08"',
        'Theora': 'video/ogg; codecs="theora"',
        'AAC': 'audio/mp4; codecs="mp4a.40.2"',
        'Opus': 'audio/webm; codecs="opus"',
        'FLAC': 'audio/flac',
        'MP3': 'audio/mpeg',
    };

    for (const [name, mime] of Object.entries(tests)) {
        const result = video.canPlayType(mime);
        codecs[name] = result || 'no';
    }

    const supported = Object.entries(codecs).filter(([, v]) => v !== 'no' && v !== '').map(([k]) => k);
    const unsupported = Object.entries(codecs).filter(([, v]) => v === 'no' || v === '').map(([k]) => k);

    return { codecs, supported, unsupported };
}

// --- CPU BENCHMARK ---

export function benchmarkCPU() {
    const start = performance.now();
    // Run a deterministic computation
    let x = 0;
    for (let i = 0; i < 2000000; i++) {
        x += Math.sqrt(i) * Math.sin(i);
    }
    const elapsed = performance.now() - start;

    let tier;
    if (elapsed < 15) tier = 'Very fast \u2014 high-end desktop or recent laptop';
    else if (elapsed < 40) tier = 'Fast \u2014 modern machine';
    else if (elapsed < 100) tier = 'Average';
    else if (elapsed < 250) tier = 'Slower \u2014 older or budget hardware';
    else tier = 'Slow \u2014 likely mobile or very old hardware';

    return { elapsed: elapsed.toFixed(1), tier, dummy: x };
}

// --- JS HEAP MEMORY (Chrome only) ---

export function detectMemoryInfo() {
    const mem = performance.memory; // Chrome only
    if (!mem) return null;
    return {
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
        totalJSHeapSize: mem.totalJSHeapSize,
        usedJSHeapSize: mem.usedJSHeapSize,
        limitMB: Math.round(mem.jsHeapSizeLimit / (1024 * 1024)),
        usedMB: Math.round(mem.usedJSHeapSize / (1024 * 1024)),
    };
}

// --- WEBGPU FINGERPRINT ---

export async function detectWebGPU() {
    const result = { available: false, features: [], limits: {}, adapterInfo: null };
    try {
        if (!navigator.gpu) return result;
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return result;
        result.available = true;
        result.features = [...adapter.features];

        const device = await adapter.requestDevice();
        const l = device.limits;
        result.limits = {
            maxTextureDimension2D: l.maxTextureDimension2D,
            maxBufferSize: l.maxBufferSize,
            maxStorageBufferBindingSize: l.maxStorageBufferBindingSize,
            maxComputeWorkgroupSizeX: l.maxComputeWorkgroupSizeX,
            maxComputeWorkgroupSizeY: l.maxComputeWorkgroupSizeY,
            maxComputeWorkgroupSizeZ: l.maxComputeWorkgroupSizeZ,
            maxComputeInvocationsPerWorkgroup: l.maxComputeInvocationsPerWorkgroup,
            maxComputeWorkgroupStorageSize: l.maxComputeWorkgroupStorageSize,
            maxColorAttachments: l.maxColorAttachments,
        };

        // Adapter info (if available)
        if (adapter.info) {
            result.adapterInfo = {
                vendor: adapter.info.vendor,
                architecture: adapter.info.architecture,
                device: adapter.info.device,
                description: adapter.info.description,
            };
        }

        device.destroy();
    } catch (e) {}
    return result;
}

// --- CLIENTRECTS SUB-PIXEL FINGERPRINT ---

export function detectClientRects() {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(container);

    const tests = [
        { text: 'The quick brown fox jumps over the lazy dog', font: 'serif', size: '16px' },
        { text: 'mmmmmmmmmmlli', font: 'sans-serif', size: '72px' },
        { text: 'WwMmLlIi0Oo1', font: 'monospace', size: '14px' },
        { text: '\u0410\u0411\u0412\u0413\u0414', font: 'serif', size: '20px' }, // Cyrillic
        { text: 'fi fl ffi ffl', font: 'serif', size: '24px' }, // Ligatures
    ];

    const rects = [];
    for (const t of tests) {
        const span = document.createElement('span');
        span.style.cssText = `font-family:${t.font};font-size:${t.size};line-height:normal;display:inline;`;
        span.textContent = t.text;
        container.appendChild(span);
        const r = span.getBoundingClientRect();
        rects.push({
            w: r.width,
            h: r.height,
        });
    }

    document.body.removeChild(container);

    // Create a fingerprint from the sub-pixel values
    const raw = rects.map(r => `${r.w.toFixed(6)},${r.h.toFixed(6)}`).join('|');

    return { rects, raw };
}

// --- WASM TIMING FINGERPRINT ---

export async function detectWASMTiming() {
    const result = { available: false, ratio: null, likelyEngine: null };
    try {
        // Create a minimal WASM module with a simple function
        const wasmBytes = new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, // magic
            0x01, 0x00, 0x00, 0x00, // version
            0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f, // type: () -> i32
            0x03, 0x02, 0x01, 0x00, // function
            0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00, // export "add"
            0x0a, 0x09, 0x01, 0x07, 0x00, 0x41, 0x01, 0x41, 0x01, 0x6a, 0x0b, // code: i32.const 1; i32.const 1; i32.add
        ]);

        const module = await WebAssembly.compile(wasmBytes);
        const instance = await WebAssembly.instantiate(module);
        const wasmFn = instance.exports.add;
        result.available = true;

        // Baseline: direct WASM call
        const iterations = 500000;
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) wasmFn();
        const directTime = performance.now() - start1;

        // Scripted setter test: WASM function as property setter
        const obj = {};
        Object.defineProperty(obj, 'x', { set: wasmFn });
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) obj.x = i;
        const setterTime = performance.now() - start2;

        result.ratio = setterTime / directTime;

        // The ratio is a fingerprinting signal but NOT a reliable engine detector
        // on its own — real-world results vary wildly from the paper's thresholds.
        // We report the ratio as data but don't claim to know the engine from it.
        result.likelyEngine = null;

    } catch (e) {}
    return result;
}

// --- KEYBOARD LAYOUT ---

export async function detectKeyboardLayout() {
    const result = { available: false, layout: null, keys: {} };
    try {
        if (!navigator.keyboard?.getLayoutMap) return result;
        const layoutMap = await navigator.keyboard.getLayoutMap();
        result.available = true;

        // Sample key positions to determine layout
        const probeKeys = ['KeyQ', 'KeyW', 'KeyA', 'KeyZ', 'KeyY', 'Semicolon', 'BracketLeft'];
        for (const code of probeKeys) {
            result.keys[code] = layoutMap.get(code) || null;
        }

        // Detect layout type
        const q = result.keys['KeyQ'];
        const w = result.keys['KeyW'];
        const a = result.keys['KeyA'];
        const z = result.keys['KeyZ'];
        const y = result.keys['KeyY'];

        if (q === 'q' && w === 'w' && z === 'z') {
            result.layout = 'QWERTY';
        } else if (q === 'a' && w === 'z') {
            result.layout = 'AZERTY';
            result.comment = 'French keyboard layout.';
        } else if (q === 'q' && w === 'w' && y === 'z') {
            result.layout = 'QWERTZ';
            result.comment = 'German keyboard layout.';
        } else if (q === "'" && w === ',' && a === 'a') {
            result.layout = 'Dvorak';
            result.comment = 'Dvorak layout \u2014 only about 0.1% of people use this. Extremely identifiable.';
        } else if (q === 'q' && w === 'w' && a === 'a' && result.keys['Semicolon'] === 'o') {
            result.layout = 'Colemak';
            result.comment = 'Colemak layout \u2014 a deliberate ergonomic choice. Very rare.';
        } else {
            result.layout = `Non-standard (Q=${q}, W=${w})`;
        }
    } catch (e) {}
    return result;
}

// --- EXTENDED MATH FINGERPRINT ---

export function detectMathFingerprint() {
    const values = {
        'tan(-1e300)': Math.tan(-1e300),
        'sinh(1)': Math.sinh(1),
        'cosh(1)': Math.cosh(1),
        'tanh(0.5)': Math.tanh(0.5),
        'expm1(1)': Math.expm1(1),
        'log1p(1)': Math.log1p(1),
        'atanh(0.5)': Math.atanh(0.5),
        'cbrt(2)': Math.cbrt(2),
        'log(Math.E)': Math.log(Math.E),
        'sin(Math.PI)': Math.sin(Math.PI),
        'pow(2.00001,100)': Math.pow(2.00001, 100),
    };

    // Different engines produce different values at the last few bits of precision
    const raw = Object.values(values).map(v => v.toString()).join(',');

    return { values, raw };
}

// --- PHYSICAL SCREEN SIZE ---

export function detectPhysicalScreen() {
    const w = screen.width;
    const h = screen.height;
    const dpr = window.devicePixelRatio || 1;
    const physW = w * dpr; // device pixels
    const physH = h * dpr;

    // Known device database (device pixels → diagonal inches)
    const devices = [
        // MacBooks
        { pw: 2560, ph: 1600, diag: 13.3, name: 'MacBook Air 13"' },
        { pw: 2880, ph: 1800, diag: 15.3, name: 'MacBook Air 15"' },
        { pw: 2940, ph: 1912, diag: 14.2, name: 'MacBook Pro 14"' },
        { pw: 3024, ph: 1964, diag: 14.2, name: 'MacBook Pro 14"' },
        { pw: 3456, ph: 2234, diag: 16.2, name: 'MacBook Pro 16"' },
        { pw: 2560, ph: 1664, diag: 13.6, name: 'MacBook Air 13" (M2+)' },
        { pw: 3456, ph: 2160, diag: 16.0, name: 'MacBook Pro 16" (older)' },
        // iMac
        { pw: 4480, ph: 2520, diag: 24, name: 'iMac 24"' },
        { pw: 5120, ph: 2880, diag: 27, name: 'Apple Studio Display / iMac 27"' },
        // iPads
        { pw: 2048, ph: 2732, diag: 12.9, name: 'iPad Pro 12.9"' },
        { pw: 2388, ph: 1668, diag: 11, name: 'iPad Pro 11"' },
        { pw: 2360, ph: 1640, diag: 10.9, name: 'iPad Air' },
        { pw: 2160, ph: 1620, diag: 10.2, name: 'iPad' },
        // iPhones
        { pw: 1290, ph: 2796, diag: 6.7, name: 'iPhone Pro Max' },
        { pw: 1179, ph: 2556, diag: 6.1, name: 'iPhone Pro' },
        { pw: 1170, ph: 2532, diag: 6.1, name: 'iPhone' },
        { pw: 1080, ph: 2340, diag: 6.1, name: 'iPhone' },
        // Common external monitors
        { pw: 3840, ph: 2160, diag: 27, name: '4K 27" monitor' },
        { pw: 3840, ph: 2160, diag: 32, name: '4K 32" monitor' },
        { pw: 2560, ph: 1440, diag: 27, name: 'QHD 27" monitor' },
        { pw: 1920, ph: 1080, diag: 24, name: 'FHD 24" monitor' },
        { pw: 1920, ph: 1080, diag: 27, name: 'FHD 27" monitor' },
        { pw: 3440, ph: 1440, diag: 34, name: 'Ultrawide 34"' },
        { pw: 5120, ph: 1440, diag: 49, name: 'Super Ultrawide 49"' },
    ];

    // Find closest match
    let bestMatch = null;
    let bestDist = Infinity;
    for (const d of devices) {
        const dist = Math.abs(d.pw - physW) + Math.abs(d.ph - physH);
        // Also check rotated (for mobile)
        const distRot = Math.abs(d.pw - physH) + Math.abs(d.ph - physW);
        const minDist = Math.min(dist, distRot);
        if (minDist < bestDist) {
            bestDist = minDist;
            bestMatch = d;
        }
    }

    // Only confident if close match
    const confident = bestDist < 100;

    // Fallback: estimate from DPI assumption
    let estimatedDiag = null;
    if (!confident) {
        // Assume 110 PPI for desktops, 160 PPI for mobile
        const isMobile = ('ontouchstart' in window) && Math.max(w, h) < 1400;
        const ppi = isMobile ? 160 : 110;
        const physWidthIn = physW / ppi;
        const physHeightIn = physH / ppi;
        estimatedDiag = Math.sqrt(physWidthIn ** 2 + physHeightIn ** 2);
        estimatedDiag = Math.round(estimatedDiag * 10) / 10;
    }

    return {
        devicePixels: { w: physW, h: physH },
        match: confident ? bestMatch : null,
        estimated: confident ? bestMatch.diag : estimatedDiag,
        name: confident ? bestMatch.name : null,
        confident,
    };
}

// --- READING SPEED ---

export function createReadingTracker() {
    // Word counts per section (approximate)
    const sectionWords = {
        basics: 35,
        device: 40,
        hardware: 60,
        network: 55,
        preferences: 50,
        fonts: 40,
        canvas: 60,
        audio: 35,
        deeper: 120,
        behavior: 60,
        fingerprint: 80,
        profile: 80,
    };

    const tracker = {
        sectionTimes: {},
        totalWords: 0,
        totalReadTime: 0,
    };

    tracker.calculate = (sectionDurations) => {
        let totalWords = 0;
        let totalTime = 0;

        for (const [section, timeMs] of Object.entries(sectionDurations)) {
            const words = sectionWords[section] || 40;
            const timeSec = timeMs / 1000;
            // Only count sections where they spent a reasonable reading time
            if (timeSec >= 2 && timeSec <= 120) {
                totalWords += words;
                totalTime += timeSec;
            }
        }

        if (totalTime < 5) return null;

        const wpm = Math.round((totalWords / totalTime) * 60);

        let comment = '';
        if (wpm > 400) comment = 'Speed reader. Or skimming.';
        else if (wpm > 275) comment = 'Above average. You process text quickly.';
        else if (wpm > 200) comment = 'Average adult reading speed.';
        else if (wpm > 150) comment = 'You\u2019re reading carefully. Taking it in.';
        else comment = 'You\u2019re very thorough. Or re-reading sections.';

        return { wpm, totalWords, totalTimeSec: Math.round(totalTime), comment };
    };

    return tracker;
}

// --- SCROLLBAR WIDTH ---

export function detectScrollbar() {
    const outer = document.createElement('div');
    outer.style.cssText = 'width:100px;height:100px;overflow:scroll;position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
    const inner = document.createElement('div');
    inner.style.cssText = 'width:100%;height:200px;';
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const scrollbarWidth = outer.offsetWidth - outer.clientWidth;
    document.body.removeChild(outer);

    let style = '';
    if (scrollbarWidth === 0) style = 'Overlay scrollbars (macOS default)';
    else if (scrollbarWidth <= 15) style = 'Thin scrollbars (macOS legacy or Linux)';
    else if (scrollbarWidth <= 17) style = 'Standard scrollbars (Windows)';
    else style = `Wide scrollbars (${scrollbarWidth}px)`;

    return { width: scrollbarWidth, style };
}

// --- PRIVACY PROTECTION DETECTION ---
// Detect when a browser is actively farbling/obfuscating signals

export function detectPrivacyProtection() {
    const signals = [];
    let isBrave = false;

    // Brave detection: Brave adds navigator.brave
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
        isBrave = true;
        signals.push('Brave browser detected \u2014 fingerprinting defenses are active');
    }

    // Farbled deviceMemory: Brave randomizes to powers of 2 that may not match reality
    // Real values are 0.25, 0.5, 1, 2, 4, 8. Brave may report incorrect values.
    const mem = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;

    // Odd core counts are suspicious (most CPUs have even core counts or Apple's 8/10/12)
    if (cores && cores % 2 !== 0 && cores !== 1) {
        signals.push(`CPU core count (${cores}) is odd \u2014 likely farbled by your browser`);
    }

    // Very low RAM on a machine with many cores suggests farbling
    if (mem && cores && mem <= 1 && cores >= 4) {
        signals.push(`RAM reported as ${mem}GB with ${cores} cores \u2014 likely farbled`);
    }

    // Firefox resistFingerprinting detection
    // When enabled, timezone reports UTC, screen size reports content size, etc.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'UTC' && navigator.language !== 'en' && !navigator.language.startsWith('en-')) {
        signals.push('Timezone reports UTC despite non-English locale \u2014 possible resistFingerprinting');
    }

    // Tor Browser detection: very specific combination
    if (tz === 'UTC' && screen.width === 1000 && screen.height === 1000) {
        signals.push('Screen reports exactly 1000\u00d71000 with UTC timezone \u2014 likely Tor Browser');
    }

    return { isBrave, signals, isProtected: signals.length > 0 };
}

// --- VM / SANDBOX DETECTION ---

export function detectVM() {
    const renderer = (window.__gpuRenderer || '').toLowerCase();
    const ua = navigator.userAgent.toLowerCase();

    const vmSignals = [];

    // GPU-based detection
    const vmGPUs = [
        { pattern: 'swiftshader', name: 'SwiftShader (software renderer)' },
        { pattern: 'llvmpipe', name: 'LLVMpipe (software renderer)' },
        { pattern: 'vmware', name: 'VMware virtual GPU' },
        { pattern: 'virtualbox', name: 'VirtualBox virtual GPU' },
        { pattern: 'parallels', name: 'Parallels virtual GPU' },
        { pattern: 'microsoft basic render', name: 'Microsoft Basic Render (no GPU driver)' },
        { pattern: 'qemu', name: 'QEMU virtual GPU' },
        { pattern: 'virtio', name: 'VirtIO virtual GPU' },
    ];

    for (const vm of vmGPUs) {
        if (renderer.includes(vm.pattern)) {
            vmSignals.push(vm.name);
        }
    }

    // Hardware anomalies
    if (navigator.hardwareConcurrency === 1) vmSignals.push('Single CPU core (unusual for modern hardware)');
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) vmSignals.push('Very low memory (2GB or less)');

    const isVM = vmSignals.length > 0;

    return { isVM, signals: vmSignals };
}

// --- COLOR PROFILE FINGERPRINT ---

export function detectColorProfile() {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });

    // Draw specific colors that are affected by color management
    const testColors = [
        { r: 255, g: 0, b: 0 },     // Pure red
        { r: 0, g: 128, b: 0 },     // Mid green
        { r: 0, g: 0, b: 255 },     // Pure blue
        { r: 128, g: 128, b: 128 }, // Mid gray
        { r: 255, g: 128, b: 0 },   // Orange
    ];

    const readback = [];

    testColors.forEach((c, i) => {
        ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
        ctx.fillRect(i * 2, 0, 2, 2);
    });

    const imageData = ctx.getImageData(0, 0, 10, 2);
    const d = imageData.data;

    // Sample each test color's actual pixel value
    for (let i = 0; i < testColors.length; i++) {
        const offset = i * 2 * 4; // 2px wide, RGBA
        readback.push({
            input: testColors[i],
            output: { r: d[offset], g: d[offset + 1], b: d[offset + 2] },
        });
    }

    // Check if any colors shifted (color management is active)
    let shifted = false;
    const diffs = [];
    for (const rb of readback) {
        const dr = Math.abs(rb.input.r - rb.output.r);
        const dg = Math.abs(rb.input.g - rb.output.g);
        const db = Math.abs(rb.input.b - rb.output.b);
        if (dr > 0 || dg > 0 || db > 0) shifted = true;
        diffs.push(dr + dg + db);
    }

    // Also detect color gamut
    const p3 = window.matchMedia('(color-gamut: p3)').matches;
    const srgb = window.matchMedia('(color-gamut: srgb)').matches;
    const rec2020 = window.matchMedia('(color-gamut: rec2020)').matches;

    let gamut = 'sRGB';
    if (rec2020) gamut = 'Rec. 2020';
    else if (p3) gamut = 'Display P3';

    // Create a fingerprint from the readback values
    const raw = readback.map(rb => `${rb.output.r},${rb.output.g},${rb.output.b}`).join('|');

    return { readback, shifted, diffs, gamut, raw };
}

// --- CANVAS PIXEL DIFF VISUALIZATION ---

export function generateCanvasDiff() {
    // Render the same canvas as our fingerprint
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // Same drawing as detectCanvas
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint \ud83d\ude00', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '18px Times New Roman';
    ctx.fillText('whatdotheyknow', 4, 45);
    ctx.beginPath();
    ctx.arc(50, 100, 40, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = '#ff5733';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(170, 80);
    ctx.bezierCurveTo(130, 100, 200, 120, 160, 140);
    ctx.strokeStyle = '#3366cc';
    ctx.lineWidth = 2;
    ctx.stroke();
    const grd = ctx.createLinearGradient(200, 0, 300, 150);
    grd.addColorStop(0, '#ff0000');
    grd.addColorStop(1, '#0000ff');
    ctx.fillStyle = grd;
    ctx.fillRect(200, 50, 90, 90);

    const imageData = ctx.getImageData(0, 0, 300, 150);
    const pixels = imageData.data;

    // Create a "reference" rendering — use a known set of expected values
    // We'll highlight pixels where the rendering differs from integer-rounded expected values
    // The key insight: anti-aliasing, sub-pixel rendering, and blending produce non-integer
    // RGBA values that differ per system. We highlight any pixel that isn't a "clean" value.

    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = 300;
    diffCanvas.height = 150;
    const diffCtx = diffCanvas.getContext('2d');

    // Start with black
    diffCtx.fillStyle = '#000';
    diffCtx.fillRect(0, 0, 300, 150);

    let uniquePixels = 0;
    const diffData = diffCtx.getImageData(0, 0, 300, 150);
    const dd = diffData.data;

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];

        // A pixel is "interesting" for fingerprinting if it has partial alpha (anti-aliased edge)
        // or if its color values are unusual (blending artifacts)
        const isEdge = a > 0 && a < 255;
        const isBlended = (r > 0 && r < 255 && g > 0 && g < 255) ||
                          (r > 0 && r < 255 && b > 0 && b < 255);
        const isSubpixel = (r % 16 !== 0 || g % 16 !== 0 || b % 16 !== 0) && a > 0;

        if (isEdge || (isBlended && isSubpixel)) {
            uniquePixels++;
            // Highlight in accent color with intensity based on how "unusual" the pixel is
            const intensity = isEdge ? 0.9 : 0.4;
            dd[i] = Math.round(196 * intensity);     // r (accent gold)
            dd[i + 1] = Math.round(154 * intensity); // g
            dd[i + 2] = Math.round(108 * intensity);  // b
            dd[i + 3] = 255;
        }
    }

    diffCtx.putImageData(diffData, 0, 0);

    return {
        diffDataUrl: diffCanvas.toDataURL(),
        originalDataUrl: canvas.toDataURL(),
        uniquePixels,
        totalPixels: (300 * 150),
    };
}

// --- CPU MICROARCHITECTURE FINGERPRINT ---

export function detectCPUArch() {
    // Time different operation types — the ratio fingerprints the CPU
    const iterations = 200000;

    // Integer arithmetic
    const intStart = performance.now();
    let x = 1000000007;
    for (let i = 0; i < iterations; i++) {
        x = (x * 1103515245 + 12345) | 0;
        x = (x ^ (x >> 16)) | 0;
    }
    const intTime = performance.now() - intStart;

    // Floating point
    const fpStart = performance.now();
    let y = 1.0;
    for (let i = 0; i < iterations; i++) {
        y = Math.sqrt(y + 1.0) * Math.sin(y + 0.1);
    }
    const fpTime = performance.now() - fpStart;

    // Trigonometric (heavier FP)
    const trigStart = performance.now();
    let z = 0.5;
    for (let i = 0; i < iterations; i++) {
        z = Math.atan2(Math.sin(z + 1.0), Math.cos(z + 0.5));
    }
    const trigTime = performance.now() - trigStart;

    // Ratios (normalize for system load)
    const intFpRatio = intTime / fpTime;
    const intTrigRatio = intTime / trigTime;
    const fpTrigRatio = fpTime / trigTime;

    // Attempt to identify architecture from ratios
    let archGuess = '';
    // Apple Silicon has very balanced int/fp due to unified architecture
    // x86 tends to have faster integer relative to trig
    // These thresholds are approximate and would need calibration
    if (intFpRatio < 0.5) archGuess = 'Likely Apple Silicon or ARM (balanced int/fp)';
    else if (intFpRatio > 1.5) archGuess = 'Likely x86 (faster integer pipeline)';
    else archGuess = 'Mixed signal';

    return {
        intTime: intTime.toFixed(2),
        fpTime: fpTime.toFixed(2),
        trigTime: trigTime.toFixed(2),
        intFpRatio: intFpRatio.toFixed(3),
        intTrigRatio: intTrigRatio.toFixed(3),
        fpTrigRatio: fpTrigRatio.toFixed(3),
        archGuess,
        // Prevent dead code elimination
        _dummy: x + y + z,
    };
}

// --- CHROME EXTENSION DETECTION ---

export function detectExtensions() {
    // Popular extensions with known web-accessible resources
    const extensions = [
        { name: 'uBlock Origin', id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', resource: 'web-accessible-resources/noop.html' },
        { name: 'React Developer Tools', id: 'fmkadmapgofadopljbjfkapdkoienihi', resource: 'main.html' },
        { name: 'Redux DevTools', id: 'lmhkpmbekcpmknklioeibfkpmmfibljd', resource: 'devpanel.html' },
        { name: 'Vue.js devtools', id: 'nhdogjmejiglipccpnnnanhbledajbpd', resource: 'devtools-background.html' },
        { name: 'Grammarly', id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen', resource: 'src/shared/otel/LICENSE' },
        { name: 'Bitwarden', id: 'nngceckbapebfimnlniiiahkandclblb', resource: 'notification/bar.html' },
        { name: '1Password', id: 'aeblfdkhhhdcdjpifhhbdiojplfjncoa', resource: 'manifest.json' },
        { name: 'Honey', id: 'bmnlcjabgnpnenekpadlanbbkooimhnj', resource: 'manifest.json' },
        { name: 'Dark Reader', id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh', resource: 'ui/popup/index.html' },
        { name: 'Metamask', id: 'nkbihfbeogaeaoehlefnkodbefgpgknn', resource: 'phishing.html' },
        { name: 'LastPass', id: 'hdokiejnpimakedhajhdlcegeplioahd', resource: 'tabDialog.html' },
        { name: 'Tampermonkey', id: 'dhdgffkkebhmkfjojejmpbldmpobfkfo', resource: 'options.html' },
    ];

    return new Promise((resolve) => {
        // Only works in Chrome
        if (!window.chrome?.runtime) {
            resolve({ available: false, detected: [] });
            return;
        }

        const detected = [];
        let remaining = extensions.length;

        for (const ext of extensions) {
            const img = new Image();
            const timeout = setTimeout(() => {
                remaining--;
                if (remaining === 0) resolve({ available: true, detected });
            }, 500);

            img.onload = () => {
                clearTimeout(timeout);
                detected.push(ext.name);
                remaining--;
                if (remaining === 0) resolve({ available: true, detected });
            };
            img.onerror = () => {
                clearTimeout(timeout);
                remaining--;
                if (remaining === 0) resolve({ available: true, detected });
            };
            img.src = `chrome-extension://${ext.id}/${ext.resource}`;
        }
    });
}

// --- ADDITIONAL SIGNALS ---

export function detectMisc() {
    const signals = {};

    // Timezone offset
    signals.timezoneOffset = new Date().getTimezoneOffset();

    // Locale details
    const opts = Intl.DateTimeFormat().resolvedOptions();
    signals.calendar = opts.calendar;
    signals.numberingSystem = opts.numberingSystem;

    // Math fingerprint
    signals.mathTan = Math.tan(-1e300);
    signals.mathLog = Math.log(3);
    signals.mathSin = Math.sin(1);

    // Storage estimate
    signals.storageEstimate = null;
    if (navigator.storage?.estimate) {
        navigator.storage.estimate().then(est => {
            signals.storageEstimate = est;
        }).catch(() => {});
    }

    // Battery
    signals.battery = null;
    if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
            signals.battery = {
                level: bat.level,
                charging: bat.charging,
            };
        }).catch(() => {});
    }

    // Plugins
    const plugins = [];
    if (navigator.plugins) {
        for (let i = 0; i < navigator.plugins.length; i++) {
            plugins.push(navigator.plugins[i].name);
        }
    }
    signals.plugins = plugins;

    // Speech voices
    signals.voices = [];
    if (window.speechSynthesis) {
        const voices = speechSynthesis.getVoices();
        signals.voices = voices.map(v => v.name);
        if (signals.voices.length === 0) {
            speechSynthesis.onvoiceschanged = () => {
                signals.voices = speechSynthesis.getVoices().map(v => v.name);
            };
        }
    }

    // Keyboard layout hint
    signals.keyboardLayout = navigator.keyboard ? 'API available' : 'unavailable';

    return signals;
}

// --- CSS PREFERENCES (reveals health/accessibility/personal choices) ---

export function detectPreferences() {
    const prefs = {};

    const mq = (query) => window.matchMedia(query).matches;

    // Dark mode
    prefs.darkMode = mq('(prefers-color-scheme: dark)');
    prefs.lightMode = mq('(prefers-color-scheme: light)');

    // Accessibility signals
    prefs.reducedMotion = mq('(prefers-reduced-motion: reduce)');
    prefs.highContrast = mq('(prefers-contrast: more)');
    prefs.lowContrast = mq('(prefers-contrast: less)');
    prefs.forcedColors = mq('(forced-colors: active)');
    prefs.reducedTransparency = mq('(prefers-reduced-transparency: reduce)');
    prefs.invertedColors = mq('(inverted-colors: inverted)');

    // Display
    prefs.hdr = mq('(dynamic-range: high)');
    prefs.p3Color = mq('(color-gamut: p3)');
    prefs.pointer = mq('(pointer: fine)') ? 'fine' : mq('(pointer: coarse)') ? 'coarse' : 'none';
    prefs.hover = mq('(hover: hover)');

    // Inferences
    const inferences = [];
    if (prefs.darkMode) inferences.push('You prefer dark mode.');
    if (prefs.reducedMotion) inferences.push('You have reduced motion enabled. This often indicates vestibular sensitivity or motion sickness \u2014 a health condition your browser freely shares with every website.');
    if (prefs.highContrast) inferences.push('You use high contrast mode. This suggests a visual impairment \u2014 medical information, transmitted without your consent.');
    if (prefs.forcedColors) inferences.push('You have forced colors enabled \u2014 typically a Windows accessibility feature for vision impairments.');
    if (prefs.invertedColors) inferences.push('You have inverted colors enabled \u2014 another accessibility signal.');
    if (prefs.reducedTransparency) inferences.push('You\u2019ve reduced transparency effects \u2014 another accessibility preference.');
    if (prefs.hdr) inferences.push('You have an HDR display.');
    if (prefs.p3Color) inferences.push('Your display supports P3 wide color gamut \u2014 likely a newer Apple device or professional monitor.');

    prefs.inferences = inferences;

    // Commentary
    let comment = '';
    if (prefs.reducedMotion || prefs.highContrast || prefs.forcedColors || prefs.invertedColors) {
        comment = 'CSS media queries can reveal health conditions and disabilities. No permission dialog. No opt-out. Every website has access to this.';
    } else {
        comment = 'These are all detectable through CSS media queries \u2014 they work even without JavaScript. Every website sees them.';
    }
    prefs.comment = comment;

    return prefs;
}

// --- MEDIA DEVICES ---

export async function detectMediaDevices() {
    const result = { cameras: 0, microphones: 0, speakers: 0, available: false };
    try {
        if (!navigator.mediaDevices?.enumerateDevices) return result;
        result.available = true;
        const devices = await navigator.mediaDevices.enumerateDevices();
        for (const d of devices) {
            if (d.kind === 'videoinput') result.cameras++;
            else if (d.kind === 'audioinput') result.microphones++;
            else if (d.kind === 'audiooutput') result.speakers++;
        }
    } catch (e) {}
    return result;
}

// --- MULTI-MONITOR ---

export function detectMultiMonitor() {
    const result = {
        isExtended: null,
        windowX: window.screenX,
        windowY: window.screenY,
        screenWidth: screen.width,
        availWidth: screen.availWidth,
    };

    // screen.isExtended is available without permission in Chrome
    if ('isExtended' in screen) {
        result.isExtended = screen.isExtended;
    }

    // Heuristic: if window is positioned beyond the primary screen bounds
    if (window.screenX < 0 || window.screenX >= screen.width) {
        result.likelyMultiMonitor = true;
    }

    return result;
}

// --- STORAGE / DISK SIZE ---

export async function detectStorage() {
    const result = { quota: null, usage: null, diskEstimate: null };
    try {
        if (navigator.storage?.estimate) {
            const est = await navigator.storage.estimate();
            result.quota = est.quota;
            result.usage = est.usage;
            // Quota is typically ~60% of total disk on Chrome, ~50% on Firefox
            if (est.quota) {
                const diskGB = Math.round((est.quota / 0.6) / (1024 ** 3));
                // Round to common disk sizes
                const commonSizes = [128, 256, 512, 1024, 2048, 4096];
                result.diskEstimate = commonSizes.reduce((prev, curr) =>
                    Math.abs(curr - diskGB) < Math.abs(prev - diskGB) ? curr : prev
                );
            }
        }
    } catch (e) {}
    return result;
}

// --- WEBRTC STUN IP ---

export async function detectWebRTC() {
    const result = { publicIP: null, localIPs: [], available: false };
    try {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        result.available = true;
        pc.createDataChannel('');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                pc.close();
                resolve(result);
            }, 3000);

            pc.onicecandidate = (event) => {
                if (!event.candidate) {
                    clearTimeout(timeout);
                    pc.close();
                    resolve(result);
                    return;
                }
                const candidate = event.candidate.candidate;
                const ipv4 = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
                if (ipv4) {
                    const ip = ipv4[0];
                    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) {
                        if (!result.localIPs.includes(ip)) result.localIPs.push(ip);
                    } else if (ip !== '0.0.0.0') {
                        result.publicIP = ip;
                    }
                }
            };
        });
    } catch (e) {
        return result;
    }
}

// --- BEHAVIORAL TRACKING ---

export function createBehaviorTracker() {
    const tracker = {
        mousePositions: [],
        mouseVelocities: [],
        scrollEvents: [],
        totalMouseDistance: 0,
        maxMouseSpeed: 0,
        avgMouseSpeed: 0,
        scrollDepthMax: 0,
        scrollDirectionChanges: 0,
        startTime: performance.now(),
        lastMousePos: null,
        lastScrollY: 0,
        lastScrollDir: null,
        hoverTimes: new Map(), // track time spent in sections
        currentSection: null,
        sectionEnterTime: null,
        sectionDurations: {},
    };

    // Mouse tracking
    const mouseHandler = (e) => {
        const now = performance.now();
        const pos = { x: e.clientX, y: e.clientY, t: now };

        if (tracker.lastMousePos) {
            const dx = pos.x - tracker.lastMousePos.x;
            const dy = pos.y - tracker.lastMousePos.y;
            const dt = pos.t - tracker.lastMousePos.t;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = dt > 0 ? dist / dt : 0;

            tracker.totalMouseDistance += dist;
            tracker.mouseVelocities.push(speed);
            if (speed > tracker.maxMouseSpeed) tracker.maxMouseSpeed = speed;
        }

        tracker.lastMousePos = pos;
        if (tracker.mousePositions.length < 2000) {
            tracker.mousePositions.push(pos);
        }
    };

    // Scroll tracking
    const scrollHandler = () => {
        const y = window.scrollY;
        const dir = y > tracker.lastScrollY ? 'down' : 'up';

        if (tracker.lastScrollDir && dir !== tracker.lastScrollDir) {
            tracker.scrollDirectionChanges++;
        }

        if (y > tracker.scrollDepthMax) tracker.scrollDepthMax = y;
        tracker.lastScrollDir = dir;
        tracker.lastScrollY = y;
        tracker.scrollEvents.push({ y, t: performance.now() });
    };

    // Section time tracking via IntersectionObserver
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.dataset.section;
            if (!id) return;
            if (entry.isIntersecting) {
                if (tracker.currentSection && tracker.sectionEnterTime) {
                    const duration = performance.now() - tracker.sectionEnterTime;
                    tracker.sectionDurations[tracker.currentSection] =
                        (tracker.sectionDurations[tracker.currentSection] || 0) + duration;
                }
                tracker.currentSection = id;
                tracker.sectionEnterTime = performance.now();
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.section[data-section]').forEach(s => {
        sectionObserver.observe(s);
    });

    document.addEventListener('mousemove', mouseHandler);
    document.addEventListener('scroll', scrollHandler, { passive: true });

    tracker.getStats = () => {
        const elapsed = (performance.now() - tracker.startTime) / 1000;
        const avgSpeed = tracker.mouseVelocities.length > 0
            ? tracker.mouseVelocities.reduce((a, b) => a + b, 0) / tracker.mouseVelocities.length
            : 0;

        // Finalize current section — use a COPY to avoid double-counting
        const durations = { ...tracker.sectionDurations };
        if (tracker.currentSection && tracker.sectionEnterTime) {
            const duration = performance.now() - tracker.sectionEnterTime;
            durations[tracker.currentSection] = (durations[tracker.currentSection] || 0) + duration;
        }

        // Find section they spent most time on
        let longestSection = null;
        let longestTime = 0;
        for (const [section, time] of Object.entries(durations)) {
            if (time > longestTime) {
                longestTime = time;
                longestSection = section;
            }
        }

        return {
            elapsed: elapsed.toFixed(1),
            totalMouseDistance: Math.round(tracker.totalMouseDistance),
            mouseEvents: tracker.mousePositions.length,
            maxMouseSpeed: tracker.maxMouseSpeed.toFixed(1),
            avgMouseSpeed: avgSpeed.toFixed(2),
            scrollDepthMax: tracker.scrollDepthMax,
            scrollDirectionChanges: tracker.scrollDirectionChanges,
            scrollEvents: tracker.scrollEvents.length,
            longestSection,
            longestTime: longestTime > 0 ? (longestTime / 1000).toFixed(1) : null,
            sectionDurations: durations,
        };
    };

    return tracker;
}

// --- REFERRER ---

export function detectReferrer() {
    const ref = document.referrer;
    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign');

    let source = 'direct';
    let comment = 'You typed the URL directly, or someone sent you a link.';

    if (ref) {
        try {
            const refUrl = new URL(ref);
            const host = refUrl.hostname.replace('www.', '');

            if (/twitter\.com|x\.com|t\.co/.test(host)) {
                source = 'twitter';
                comment = 'You came here from Twitter. Was it a viral post?';
            } else if (/reddit\.com/.test(host)) {
                source = 'reddit';
                comment = 'You came here from Reddit. Which subreddit?';
            } else if (/news\.ycombinator\.com|hn\.algolia/.test(host)) {
                source = 'hackernews';
                comment = 'You came here from Hacker News. Of course you did.';
            } else if (/facebook\.com|fb\.com/.test(host)) {
                source = 'facebook';
                comment = 'You came here from Facebook.';
            } else if (/linkedin\.com/.test(host)) {
                source = 'linkedin';
                comment = 'You came here from LinkedIn.';
            } else if (/google\.\w+/.test(host)) {
                source = 'google';
                comment = 'You found this through Google.';
            } else if (/bing\.com/.test(host)) {
                source = 'bing';
                comment = 'You came from Bing. That\u2019s surprisingly rare.';
            } else if (/duckduckgo\.com/.test(host)) {
                source = 'duckduckgo';
                comment = 'You came from DuckDuckGo. Privacy-conscious. We respect that.';
            } else if (/tiktok\.com/.test(host)) {
                source = 'tiktok';
                comment = 'You came here from TikTok.';
            } else if (/youtube\.com/.test(host)) {
                source = 'youtube';
                comment = 'You came here from YouTube.';
            } else if (/mastodon|fosstodon/.test(host)) {
                source = 'mastodon';
                comment = 'You came from the Fediverse. A person of culture.';
            } else if (/threads\.net/.test(host)) {
                source = 'threads';
                comment = 'You came here from Threads.';
            } else if (/bluesky|bsky/.test(host)) {
                source = 'bluesky';
                comment = 'You came from Bluesky.';
            } else {
                source = host;
                comment = `You came here from ${host}.`;
            }
        } catch (e) {}
    }

    if (utmSource) {
        comment += ` UTM source: ${utmSource}.`;
        if (utmCampaign) comment += ` Campaign: ${utmCampaign}.`;
    }

    return { source, comment, referrer: ref, utm: { utmSource, utmMedium, utmCampaign } };
}

// --- HASHING ---

export async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- COMBINED FINGERPRINT ---

export async function computeFingerprint(data) {
    const components = [
        data.basics?.tz,
        data.basics?.locale,
        data.basics?.languages?.join(','),
        data.device?.os,
        data.device?.browser,
        data.device?.screen?.width + 'x' + data.device?.screen?.height,
        data.device?.screen?.colorDepth,
        String(data.device?.screen?.pixelRatio),
        String(data.device?.touchSupport),
        String(data.device?.maxTouchPoints),
        data.device?.platform,
        data.hardware?.gpu?.renderer,
        data.hardware?.gpu?.vendor,
        String(data.hardware?.gpu?.extensions),
        String(data.hardware?.cores),
        String(data.hardware?.memory),
        data.canvasHash,
        String(data.audio?.sum),
        String(data.audio?.sampleRate),
        data.fonts?.detected?.join(','),
        String(data.misc?.mathTan),
        String(data.misc?.mathLog),
        String(data.misc?.mathSin),
        String(data.misc?.timezoneOffset),
        data.misc?.plugins?.join(','),
        String(data.misc?.voices?.length),
        String(data.network?.dnt),
        String(data.preferences?.darkMode),
        String(data.preferences?.reducedMotion),
        String(data.preferences?.highContrast),
        String(data.preferences?.hdr),
        String(data.preferences?.p3Color),
        String(data.mediaDevices?.cameras),
        String(data.mediaDevices?.microphones),
        String(data.mediaDevices?.speakers),
        String(data.storage?.diskEstimate),
        String(data.multiMonitor?.isExtended),
        data.clientRects?.raw,
        data.mathFingerprint?.raw,
        String(data.wasmTiming?.ratio),
        data.webgpu?.features?.join(','),
        data.keyboardLayout?.layout,
        data.extensions?.detected?.join(','),
    ];

    const raw = components.filter(Boolean).join('|||');
    const hash = await sha256(raw);
    return hash;
}

// --- ENTROPY ESTIMATION ---

export function estimateEntropy(data) {
    // Rough entropy estimates based on known distributions
    // These are approximate bits of entropy per signal
    const rows = [];

    if (data.basics?.tz) {
        rows.push({
            signal: 'Timezone',
            value: data.basics.tz,
            bits: 5.2,
            uniqueness: '1 in 37',
        });
    }

    if (data.basics?.locale) {
        rows.push({
            signal: 'Language',
            value: data.basics.locale,
            bits: 4.8,
            uniqueness: '1 in 28',
        });
    }

    if (data.device?.screen) {
        const s = data.device.screen;
        rows.push({
            signal: 'Screen resolution',
            value: `${s.width}\u00d7${s.height} @${s.pixelRatio}x`,
            bits: 6.5,
            uniqueness: '1 in 91',
        });
    }

    if (data.device?.os && data.device?.browser) {
        rows.push({
            signal: 'OS + Browser',
            value: `${data.device.os} / ${data.device.browser} ${data.device.browserVersion}`,
            bits: 5.8,
            uniqueness: '1 in 56',
        });
    }

    if (data.hardware?.gpu?.renderer) {
        rows.push({
            signal: 'GPU',
            value: data.hardware.gpu.renderer,
            bits: 8.5,
            uniqueness: '1 in 362',
        });
    }

    if (data.hardware?.cores) {
        rows.push({
            signal: 'CPU cores',
            value: String(data.hardware.cores),
            bits: 3.2,
            uniqueness: '1 in 9',
        });
    }

    if (data.fonts?.total) {
        rows.push({
            signal: 'Installed fonts',
            value: `${data.fonts.total} fonts`,
            bits: 11.4,
            uniqueness: `1 in ${(2700).toLocaleString()}`,
        });
    }

    if (data.canvasHash) {
        rows.push({
            signal: 'Canvas fingerprint',
            value: data.canvasHash.substring(0, 12) + '\u2026',
            bits: 14.2,
            uniqueness: `1 in ${(18800).toLocaleString()}`,
        });
    }

    if (data.audio?.sum && data.audio.sum !== 'unavailable') {
        rows.push({
            signal: 'Audio fingerprint',
            value: String(data.audio.sum).substring(0, 12) + '\u2026',
            bits: 10.8,
            uniqueness: `1 in ${(1780).toLocaleString()}`,
        });
    }

    if (data.misc?.voices?.length > 0) {
        rows.push({
            signal: 'Speech voices',
            value: `${data.misc.voices.length} voices`,
            bits: 5.5,
            uniqueness: '1 in 45',
        });
    }

    if (data.preferences) {
        const prefSignals = [
            data.preferences.darkMode ? 'dark' : 'light',
            data.preferences.reducedMotion ? 'reduced-motion' : '',
            data.preferences.highContrast ? 'high-contrast' : '',
            data.preferences.hdr ? 'hdr' : '',
        ].filter(Boolean).join(', ') || 'defaults';
        rows.push({
            signal: 'CSS preferences',
            value: prefSignals,
            bits: 3.8,
            uniqueness: '1 in 14',
        });
    }

    if (data.mediaDevices?.available) {
        rows.push({
            signal: 'Media devices',
            value: `${data.mediaDevices.cameras}cam/${data.mediaDevices.microphones}mic/${data.mediaDevices.speakers}spk`,
            bits: 3.5,
            uniqueness: '1 in 11',
        });
    }

    if (data.storage?.diskEstimate) {
        rows.push({
            signal: 'Disk size',
            value: `~${data.storage.diskEstimate >= 1024 ? (data.storage.diskEstimate/1024)+'TB' : data.storage.diskEstimate+'GB'}`,
            bits: 2.8,
            uniqueness: '1 in 7',
        });
    }

    if (data.clientRects?.raw) {
        rows.push({
            signal: 'Text rendering',
            value: 'sub-pixel hash',
            bits: 8.2,
            uniqueness: `1 in ${(295).toLocaleString()}`,
        });
    }

    if (data.wasmTiming?.available) {
        rows.push({
            signal: 'WASM timing',
            value: `ratio: ${data.wasmTiming.ratio?.toFixed(2)}`,
            bits: 2.5,
            uniqueness: '1 in 6',
        });
    }

    if (data.extensions?.detected?.length > 0) {
        rows.push({
            signal: 'Extensions',
            value: `${data.extensions.detected.length} detected`,
            bits: 6.0,
            uniqueness: '1 in 64',
        });
    }

    if (data.webgpu?.available) {
        rows.push({
            signal: 'WebGPU features',
            value: `${data.webgpu.features.length} features`,
            bits: 5.0,
            uniqueness: '1 in 32',
        });
    }

    // Total bits
    const totalBits = rows.reduce((sum, r) => sum + r.bits, 0);
    const totalUniqueness = Math.pow(2, totalBits);

    return { rows, totalBits, totalUniqueness };
}

// --- SIGNAL STABILITY ANALYSIS ---

export function analyzeStability(data) {
    // Categorize every signal by how stable it is across changes
    // stable: survives device config changes, browser updates, location changes
    // semi: changes with some config changes (monitor, timezone)
    // volatile: changes frequently or per-session

    const signals = [
        // Hardware — very stable
        { name: 'GPU renderer', category: 'stable', bits: 8.5,
          reason: 'Built into your machine. Never changes unless you swap hardware.' },
        { name: 'CPU cores', category: 'stable', bits: 3.2,
          reason: 'Physical hardware. Fixed.' },
        { name: 'Device memory', category: 'stable', bits: 2.0,
          reason: 'Physical RAM. Fixed.' },
        { name: 'Canvas hash', category: 'stable', bits: 14.2,
          reason: 'Depends on GPU + driver + font rasterizer. Survives reboots, travel, network changes.' },
        { name: 'Audio fingerprint', category: 'stable', bits: 10.8,
          reason: 'Depends on audio hardware + driver. Extremely stable.' },
        { name: 'Emoji rendering', category: 'stable', bits: 8.0,
          reason: 'Depends on OS + font renderer. Only changes with OS updates.' },
        { name: 'Math constants', category: 'stable', bits: 3.0,
          reason: 'Depends on JS engine + CPU architecture. Changes only with browser major version.' },
        { name: 'WASM timing ratio', category: 'stable', bits: 2.5,
          reason: 'JS engine characteristic. Survives everything except switching browsers.' },
        { name: 'Text rendering (ClientRects)', category: 'stable', bits: 8.2,
          reason: 'Font rasterizer + GPU + OS. Extremely stable.' },
        { name: 'Installed fonts', category: 'stable', bits: 11.4,
          reason: 'You rarely install or remove fonts. Very stable over months.' },

        // OS/Browser — semi-stable
        { name: 'OS + browser version', category: 'semi', bits: 5.8,
          reason: 'Changes with updates, but updates happen on a predictable schedule.' },
        { name: 'Speech voices', category: 'semi', bits: 5.5,
          reason: 'Changes if you install language packs. Otherwise stable.' },
        { name: 'WebGPU features', category: 'semi', bits: 5.0,
          reason: 'Can change with browser or driver updates.' },
        { name: 'Disk size', category: 'stable', bits: 2.8,
          reason: 'Physical hardware. Fixed.' },
        { name: 'CSS preferences', category: 'semi', bits: 3.8,
          reason: 'Dark mode, reduced motion — you set these once and rarely change them.' },
        { name: 'Ad blocker', category: 'semi', bits: 1.5,
          reason: 'You either run one or you don\u2019t. Stable per browser profile.' },

        // Context-dependent — volatile
        { name: 'Screen resolution', category: 'volatile', bits: 6.5,
          reason: 'Changes when you plug in a monitor, change display settings, or switch devices.' },
        { name: 'Timezone', category: 'volatile', bits: 5.2,
          reason: 'Changes when you travel.' },
        { name: 'IP address / location', category: 'volatile', bits: 8.0,
          reason: 'Changes with network, VPN, travel.' },
        { name: 'Language', category: 'semi', bits: 4.8,
          reason: 'You rarely change your browser language, but it\u2019s user-controlled.' },
        { name: 'Referrer', category: 'volatile', bits: 3.0,
          reason: 'Different every visit.' },
        { name: 'Media devices', category: 'volatile', bits: 3.5,
          reason: 'Changes when you plug in headphones, a USB mic, etc.' },
    ];

    const stable = signals.filter(s => s.category === 'stable');
    const semi = signals.filter(s => s.category === 'semi');
    const volatile = signals.filter(s => s.category === 'volatile');

    const stableBits = stable.reduce((sum, s) => sum + s.bits, 0);
    const semiBits = semi.reduce((sum, s) => sum + s.bits, 0);
    const volatileBits = volatile.reduce((sum, s) => sum + s.bits, 0);
    const totalBits = stableBits + semiBits + volatileBits;

    // Even with ONLY stable signals, how unique are you?
    const stableUniqueness = Math.pow(2, stableBits);
    // With stable + semi-stable?
    const stableSemiUniqueness = Math.pow(2, stableBits + semiBits);

    // Scenarios
    const scenarios = [
        {
            name: 'You travel to a new timezone',
            surviving: stableBits + semiBits + (volatileBits - 5.2 - 8.0), // lose tz + IP
            lost: 'timezone, IP address',
        },
        {
            name: 'You plug in an external monitor',
            surviving: stableBits + semiBits + (volatileBits - 6.5 - 3.5), // lose screen + media devices
            lost: 'screen resolution, media device count',
        },
        {
            name: 'You switch to a VPN',
            surviving: stableBits + semiBits + (volatileBits - 8.0), // lose IP
            lost: 'IP address / location',
        },
        {
            name: 'You clear cookies and use incognito',
            surviving: totalBits, // fingerprinting doesn't use cookies!
            lost: 'nothing \u2014 fingerprinting doesn\u2019t use cookies',
        },
        {
            name: 'You switch to a completely different device',
            surviving: 5.2 + 4.8 + 8.0, // only tz + language + IP survive
            lost: 'almost everything \u2014 but your IP, timezone, and language still link you',
        },
    ];

    return {
        signals,
        stable, semi, volatile,
        stableBits: Math.round(stableBits * 10) / 10,
        semiBits: Math.round(semiBits * 10) / 10,
        volatileBits: Math.round(volatileBits * 10) / 10,
        totalBits: Math.round(totalBits * 10) / 10,
        stableUniqueness,
        stableSemiUniqueness,
        stableCount: stable.length,
        semiCount: semi.length,
        volatileCount: volatile.length,
        totalCount: signals.length,
        scenarios,
    };
}

// --- VOICE LANGUAGE ANALYSIS ---

export function analyzeVoiceLanguages(voices) {
    if (!voices || voices.length === 0) return { languages: [], comment: '' };

    const langSet = new Set();
    const langNames = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'ja': 'Japanese', 'ko': 'Korean',
        'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi', 'ru': 'Russian',
        'nl': 'Dutch', 'sv': 'Swedish', 'da': 'Danish', 'fi': 'Finnish',
        'no': 'Norwegian', 'pl': 'Polish', 'tr': 'Turkish', 'th': 'Thai',
        'vi': 'Vietnamese', 'id': 'Indonesian', 'he': 'Hebrew', 'uk': 'Ukrainian',
        'cs': 'Czech', 'el': 'Greek', 'hu': 'Hungarian', 'ro': 'Romanian',
        'sk': 'Slovak', 'bg': 'Bulgarian', 'ca': 'Catalan', 'hr': 'Croatian',
    };

    for (const name of voices) {
        // Extract language codes from voice names like "Google US English" or "Samantha (en-US)"
        const match = name.match(/\(([a-z]{2}(?:-[A-Z]{2})?)\)/);
        if (match) {
            langSet.add(match[1].substring(0, 2));
        }
        // Also match voice names that contain language names
        for (const [code, lang] of Object.entries(langNames)) {
            if (name.toLowerCase().includes(lang.toLowerCase())) {
                langSet.add(code);
            }
        }
    }

    const languages = [...langSet].map(code => langNames[code] || code);

    let comment = '';
    const nonEnglish = languages.filter(l => l !== 'English');
    if (nonEnglish.length >= 3) {
        comment = `Your system has speech voices in ${languages.length} languages including ${nonEnglish.slice(0, 3).join(', ')}. Multilingual household, or you work across cultures.`;
    } else if (nonEnglish.length >= 1) {
        comment = `You have ${nonEnglish.join(' and ')} speech voices installed alongside English. That\u2019s a personal choice \u2014 most people never install additional language packs.`;
    }

    return { languages, comment };
}

// --- HARDWARE COST ESTIMATE ---

function estimateHardwareCost(data) {
    let low = 0;
    let high = 0;
    const gpu = (data.hardware?.gpu?.renderer || '').toLowerCase();
    const os = data.device?.os || '';
    const cores = data.hardware?.cores || 0;
    const disk = data.storage?.diskEstimate || 0;
    const refreshRate = data.refreshRate?.hz || 60;

    // Base machine cost
    if (/apple m\d\s*max/.test(gpu)) { low += 2499; high += 3999; }
    else if (/apple m\d\s*pro/.test(gpu)) { low += 1999; high += 2999; }
    else if (/apple m\d/.test(gpu) && os === 'macOS') { low += 999; high += 1599; }
    else if (/apple/.test(gpu) && (os === 'iOS')) { low += 799; high += 1299; }
    else if (/rtx\s*40[89]0/.test(gpu)) { low += 1800; high += 3500; }
    else if (/rtx\s*40[67]0/.test(gpu)) { low += 1200; high += 2000; }
    else if (/rtx\s*30/.test(gpu)) { low += 800; high += 1500; }
    else if (/rtx/.test(gpu)) { low += 600; high += 1200; }
    else if (os === 'Windows') { low += 400; high += 1200; }
    else if (os === 'Android') { low += 200; high += 800; }
    else { low += 300; high += 800; }

    // Disk upgrades (Apple charges a premium)
    if (os === 'macOS' && disk >= 4096) { low += 400; high += 800; }
    else if (os === 'macOS' && disk >= 2048) { low += 200; high += 400; }
    else if (os === 'macOS' && disk >= 1024) { low += 100; high += 200; }

    // Multi-monitor
    if (data.multiMonitor?.isExtended) { low += 300; high += 1500; }

    // External peripherals hints
    if (data.mediaDevices?.microphones >= 2) { low += 50; high += 300; }

    return { low, high };
}

// --- CULTURAL SIGNALS ---

function detectCulturalSignals(data) {
    const signals = [];

    // Calendar system
    try {
        const opts = Intl.DateTimeFormat().resolvedOptions();
        if (opts.calendar && opts.calendar !== 'gregory') {
            const calNames = {
                'buddhist': 'Buddhist', 'chinese': 'Chinese', 'hebrew': 'Hebrew',
                'islamic': 'Islamic', 'japanese': 'Japanese era', 'persian': 'Persian',
                'indian': 'Indian', 'coptic': 'Coptic', 'ethiopic': 'Ethiopian',
            };
            const name = calNames[opts.calendar] || opts.calendar;
            signals.push(`Your system uses the ${name} calendar \u2014 a cultural and potentially religious indicator.`);
        }
        if (opts.numberingSystem && opts.numberingSystem !== 'latn') {
            signals.push(`Your numbering system is "${opts.numberingSystem}" rather than Western Arabic numerals.`);
        }
    } catch (e) {}

    // RTL detection
    const dir = document.documentElement.dir || document.body.dir;
    if (dir === 'rtl') {
        signals.push('Your browser is configured for right-to-left text \u2014 likely Arabic or Hebrew.');
    }

    // Currency from locale
    try {
        const fmt = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: 'USD' });
        // Check if the locale prefers comma as decimal separator
        const test = fmt.format(1234.56);
        if (test.includes('.') === false) {
            signals.push('Your locale uses commas for decimals \u2014 common in continental Europe and Latin America.');
        }
    } catch (e) {}

    // Language from browser configured languages
    const langs = navigator.languages || [];
    if (langs.length > 1) {
        const nonEn = langs.filter(l => !l.startsWith('en'));
        if (nonEn.length > 0) {
            signals.push(`Your browser is configured with ${nonEn.join(', ')} in addition to English. You likely speak or read ${nonEn.length > 1 ? 'these languages' : 'this language'}.`);
        }
    }

    return signals;
}

// --- PROFILE INFERENCE ---

export function buildProfile(data) {
    const profile = {
        narrative: '',
        cards: {},
        hardwareCost: null,
        voiceLanguages: null,
        culturalSignals: [],
    };

    const gpu = (data.hardware?.gpu?.renderer || '').toLowerCase();
    const os = data.device?.os || '';
    const browser = data.device?.browser || '';
    const cores = data.hardware?.cores || 0;
    const memory = data.hardware?.memory || 0;
    const disk = data.storage?.diskEstimate || 0;
    const fonts = data.fonts || {};
    const devFonts = fonts.devFonts || [];
    const adobeFonts = fonts.adobeFonts || [];
    const designFonts = fonts.designFonts || [];
    const totalFonts = fonts.total || 0;
    const prefs = data.preferences || {};
    const md = data.mediaDevices || {};
    const ref = data.referrer?.source || 'direct';
    const tz = data.basics?.tz || '';
    const time = new Date();
    const hour = time.getHours();
    const day = time.getDay();
    const languages = data.basics?.languages || [];

    // Voice languages
    profile.voiceLanguages = analyzeVoiceLanguages(data.misc?.voices);

    // Hardware cost
    profile.hardwareCost = estimateHardwareCost(data);

    // Cultural signals
    profile.culturalSignals = detectCulturalSignals(data);

    // --- Build scores ---
    let devScore = 0;
    let designScore = 0;
    if (devFonts.length >= 3) devScore += 3;
    else if (devFonts.length >= 1) devScore += 1;
    if (adobeFonts.length >= 2) designScore += 2;
    if (designFonts.length >= 3) designScore += 2;
    if (ref === 'hackernews') devScore += 3;
    if (os === 'Linux') devScore += 3;
    if (os === 'macOS') { devScore += 1; designScore += 1; }
    if (browser === 'Firefox' || browser === 'Brave') devScore += 1;
    if (cores >= 8) devScore += 1;
    if (data.multiMonitor?.isExtended) devScore += 1;

    // --- Build narrative ---
    const p = []; // paragraph sentences

    // Scene: time and place
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[day];
    const timeOfDay = hour < 5 ? 'late at night' : hour < 9 ? 'early in the morning' :
                      hour < 12 ? 'in the morning' : hour < 17 ? 'in the afternoon' :
                      hour < 22 ? 'in the evening' : 'late at night';
    const city = data.network?.geo?.city;
    const isWeekend = day === 0 || day === 6;

    let sceneLine = `It\u2019s ${dayName} ${timeOfDay}`;
    if (city) sceneLine += ` near ${city}`;
    sceneLine += '.';
    p.push(sceneLine);

    // Physical setup
    const isMobile = os === 'iOS' || os === 'Android';
    if (isMobile) {
        p.push(`You\u2019re on your phone.`);
    } else {
        let setupLine = 'You\u2019re ';
        if (data.multiMonitor?.isExtended) setupLine += 'at a desk with multiple monitors';
        else setupLine += 'at a computer';
        if (data.network?.connection?.effectiveType === '4g' || !data.network?.connection?.effectiveType) {
            // Likely WiFi or good connection
        }
        setupLine += '.';
        p.push(setupLine);
    }

    // Device
    const deviceGuess = data.device?.deviceGuess;
    if (deviceGuess) {
        p.push(`You\u2019re using ${deviceGuess}.`);
    } else if (os) {
        let machineLine = `A ${os} machine`;
        if (gpu.includes('apple m')) {
            const chipMatch = gpu.match(/apple (m\d+\s*(?:max|pro|ultra)?)/i);
            if (chipMatch) machineLine += ` with an ${chipMatch[1].trim().toUpperCase()} chip`;
        }
        machineLine += '.';
        p.push(machineLine);
    }

    // Cost
    const cost = profile.hardwareCost;
    if (cost.low > 0) {
        if (cost.low === cost.high || cost.high - cost.low < 300) {
            p.push(`That\u2019s roughly a $${cost.low.toLocaleString()} setup.`);
        } else {
            p.push(`That\u2019s roughly a $${cost.low.toLocaleString()}\u2013$${cost.high.toLocaleString()} setup.`);
        }
    }

    // Profession
    if (devScore >= 4 && designScore >= 3) {
        p.push('You have developer fonts and design tools. Full-stack creative \u2014 or a founder who does everything.');
    } else if (devScore >= 4) {
        p.push(`You\u2019re almost certainly a software developer.`);
        if (devFonts.length >= 2) p.push(`Your font collection gives it away: ${devFonts.slice(0, 3).join(', ')}.`);
        if (ref === 'hackernews') p.push('And you came from Hacker News.');
    } else if (designScore >= 3) {
        p.push('The Adobe fonts and typography collection suggest you work in design.');
    } else if (devScore >= 2) {
        p.push('You\u2019re probably in tech, or at least tech-adjacent.');
    }

    // Work pattern
    if (hour >= 9 && hour < 17 && !isWeekend) {
        p.push(`You\u2019re browsing during work hours on a ${dayName}. Either this is work-related, or you\u2019re taking a break.`);
    } else if (hour >= 22 || hour < 5) {
        p.push('You\u2019re up late. Night owl, or something keeping you awake?');
    } else if (isWeekend) {
        p.push(`Browsing on a ${dayName}. Your free time.`);
    }

    // Privacy posture
    if (browser === 'Brave') {
        p.push('You chose Brave \u2014 you actively care about privacy.');
    } else if (data.network?.dnt && data.adBlocker?.detected) {
        p.push('Do Not Track enabled, ad blocker running. You care about privacy, though the irony is that both of those make you more unique.');
    } else if (data.adBlocker?.detected) {
        p.push('You run an ad blocker.');
    }

    // Network
    if (data.network?.vpnLikely) {
        p.push('You\u2019re using a VPN \u2014 trying to hide, but your timezone gave you away.');
    } else if (data.network?.geo?.isp) {
        p.push(`${data.network.geo.isp} customer. Not using a VPN.`);
    }

    // Languages / culture
    if (languages.length > 2) {
        const nonEn = languages.filter(l => !l.startsWith('en'));
        if (nonEn.length > 0) {
            p.push(`Your browser is configured for ${languages.length} languages. You move between cultures.`);
        }
    }

    // Voice languages
    if (profile.voiceLanguages.comment) {
        p.push(profile.voiceLanguages.comment);
    }

    // Dark mode + accessibility
    if (prefs.darkMode) {
        p.push('You prefer dark mode.');
    }
    if (prefs.reducedMotion) {
        p.push('You have reduced motion enabled \u2014 that\u2019s a health signal your browser shares freely.');
    }

    // Taskbar
    if (data.taskbar?.position === 'left') {
        p.push('Dock on the left side of your screen. You made a deliberate choice there.');
    }

    profile.narrative = p.join(' ');

    // --- Keep card data for structured display ---
    profile.cards = {
        profession: devScore >= 4 ? ['Software developer'] :
                    devScore >= 2 ? ['Likely technical'] :
                    designScore >= 3 ? ['Designer'] : ['Knowledge worker'],
        techLevel: devScore + (data.network?.dnt ? 1 : 0) + (browser === 'Brave' || browser === 'Firefox' ? 2 : 0) + (prefs.darkMode ? 1 : 0) >= 6 ? 'Very high' :
                   devScore >= 3 ? 'Above average' : devScore >= 1 ? 'Average' : 'Casual',
        estimatedCost: cost.low > 0 ? `$${cost.low.toLocaleString()}\u2013$${cost.high.toLocaleString()}` : null,
    };

    return profile;
}

// --- LLM PROMPT GENERATOR ---

export function generateLLMPrompt(data, behaviorStats, profile, entropy) {
    const lines = [];

    lines.push(`I'm going to share data that was collected about someone purely from their web browser \u2014 no cookies, no accounts, no login. The only external API call was for IP geolocation. Everything else was detected client-side using standard browser APIs.`);
    lines.push('');
    lines.push(`Based on this information alone, tell me everything you can infer about this person \u2014 their likely profession, demographics, interests, habits, personality, socioeconomic status, and anything else you can deduce. Be specific and explain your reasoning.`);
    lines.push('');
    lines.push('=== BROWSER DATA ===');
    lines.push('');

    // Location & time
    if (data.network?.geo) {
        lines.push(`Location: ${data.network.geo.city || '?'}, ${data.network.geo.regionName || ''}, ${data.network.geo.country || '?'}`);
        lines.push(`ISP: ${data.network.geo.isp || '?'}`);
    }
    lines.push(`Timezone: ${data.basics?.tz || '?'}`);
    lines.push(`Local time at visit: ${data.basics?.time || '?'} on ${data.basics?.date || '?'}`);
    lines.push(`Languages: ${(data.basics?.languages || []).join(', ')}`);
    lines.push('');

    // Device
    lines.push(`OS: ${data.device?.os || '?'} ${data.device?.osVersion || ''}`);
    lines.push(`Browser: ${data.device?.browser || '?'} ${data.device?.browserVersion || ''}`);
    lines.push(`Screen: ${data.device?.screen?.width || '?'}\u00d7${data.device?.screen?.height || '?'} @ ${data.device?.screen?.pixelRatio || '?'}x pixel density`);
    if (data.device?.deviceGuess) lines.push(`Device guess: ${data.device.deviceGuess}`);
    lines.push(`Touch screen: ${data.device?.touchSupport ? 'yes' : 'no'}`);
    lines.push('');

    // Hardware
    lines.push(`GPU: ${data.hardware?.gpu?.renderer || '?'}`);
    lines.push(`CPU cores: ${data.hardware?.cores || '?'}`);
    if (data.hardware?.memory) lines.push(`RAM: ${data.hardware.memory} GB`);
    if (data.storage?.diskEstimate) {
        const d = data.storage.diskEstimate;
        lines.push(`Disk: ~${d >= 1024 ? (d/1024) + ' TB' : d + ' GB'}`);
    }
    if (data.multiMonitor?.isExtended) lines.push(`Multiple monitors: yes`);
    if (data.mediaDevices?.available) {
        lines.push(`Cameras: ${data.mediaDevices.cameras}, Microphones: ${data.mediaDevices.microphones}, Audio outputs: ${data.mediaDevices.speakers}`);
    }
    lines.push('');

    // Preferences
    lines.push(`Dark mode: ${data.preferences?.darkMode ? 'yes' : 'no'}`);
    if (data.preferences?.reducedMotion) lines.push(`Reduced motion: yes (accessibility setting)`);
    if (data.preferences?.highContrast) lines.push(`High contrast: yes (accessibility setting)`);
    if (data.preferences?.hdr) lines.push(`HDR display: yes`);
    if (data.preferences?.p3Color) lines.push(`Wide color gamut (P3): yes`);
    lines.push(`Do Not Track: ${data.network?.dnt ? 'enabled' : 'disabled'}`);
    lines.push('');

    // Network
    if (data.network?.connection?.effectiveType) {
        lines.push(`Connection: ${data.network.connection.effectiveType}${data.network.connection.downlink ? ', ~' + data.network.connection.downlink + ' Mbps' : ''}`);
    }
    lines.push(`VPN detected: ${data.network?.vpnLikely ? 'yes (' + data.network.vpnReason + ')' : 'no'}`);
    lines.push('');

    // Fonts
    lines.push(`Total fonts installed: ${data.fonts?.total || '?'}`);
    if (data.fonts?.devFonts?.length) lines.push(`Developer fonts: ${data.fonts.devFonts.join(', ')}`);
    if (data.fonts?.adobeFonts?.length) lines.push(`Adobe fonts: ${data.fonts.adobeFonts.join(', ')}`);
    if (data.fonts?.designFonts?.length) lines.push(`Design fonts: ${data.fonts.designFonts.join(', ')}`);
    lines.push('');

    // Fingerprints
    lines.push(`Canvas fingerprint: ${data.canvasHash || '?'}`);
    lines.push(`Audio fingerprint: ${data.audio?.sum || '?'}`);
    lines.push(`Combined fingerprint entropy: ${entropy?.totalBits?.toFixed(1) || '?'} bits`);
    lines.push(`Speech synthesis voices: ${data.misc?.voices?.length || 0}`);
    if (data.refreshRate) lines.push(`Display refresh rate: ${data.refreshRate.label}`);
    if (data.cpuBench) lines.push(`CPU benchmark: ${data.cpuBench.elapsed}ms (${data.cpuBench.tier})`);
    if (data.memoryInfo) lines.push(`JS heap limit: ${data.memoryInfo.limitMB}MB, using ${data.memoryInfo.usedMB}MB`);
    if (data.adBlocker) lines.push(`Ad blocker: ${data.adBlocker.detected ? 'yes' : 'no'}`);
    if (data.zoom?.zoom !== 100) lines.push(`Browser zoom: ${data.zoom.zoom}%`);
    if (data.taskbar?.position) lines.push(`Taskbar/dock position: ${data.taskbar.position}`);
    if (data.codecs?.supported) lines.push(`Supported codecs: ${data.codecs.supported.join(', ')}`);
    if (data.emojiHash) lines.push(`Emoji rendering hash: ${data.emojiHash}`);
    if (data.wasmTiming?.available) lines.push(`WASM timing ratio: ${data.wasmTiming.ratio?.toFixed(2)}`);
    if (data.clientRects?.raw) lines.push(`ClientRects fingerprint: ${data.clientRects.raw.substring(0, 80)}...`);
    if (data.webgpu?.available) lines.push(`WebGPU features: ${data.webgpu.features.join(', ')}`);
    if (data.keyboardLayout?.layout) lines.push(`Keyboard layout: ${data.keyboardLayout.layout}`);
    if (data.extensions?.detected?.length) lines.push(`Browser extensions detected: ${data.extensions.detected.join(', ')}`);
    lines.push('');

    // Referrer
    lines.push(`Referrer: ${data.referrer?.source || 'direct'}${data.referrer?.referrer ? ' (' + data.referrer.referrer + ')' : ''}`);
    if (data.referrer?.utm?.utmSource) lines.push(`UTM source: ${data.referrer.utm.utmSource}`);
    lines.push('');

    // Behavior
    if (behaviorStats) {
        lines.push(`Time on page: ${behaviorStats.elapsed}s`);
        if (behaviorStats.totalMouseDistance > 0) {
            lines.push(`Mouse distance: ${behaviorStats.totalMouseDistance.toLocaleString()} pixels`);
            lines.push(`Max mouse speed: ${behaviorStats.maxMouseSpeed} px/ms`);
        }
        lines.push(`Scroll direction changes: ${behaviorStats.scrollDirectionChanges}`);
        if (behaviorStats.longestSection) {
            lines.push(`Section with most attention: "${behaviorStats.longestSection}" (${behaviorStats.longestTime}s)`);
        }
    }

    lines.push('');
    lines.push('=== END DATA ===');
    lines.push('');
    lines.push('What can you infer about this person? Be thorough and specific.');

    return lines.join('\n');
}
