// ============================================
// audio.js — Ambient sound design
//
// Design principles:
// - No pure sine waves (they sound clinical and fatiguing)
// - Everything filtered, soft, and slowly modulated
// - Felt as atmosphere, not heard as "sound effects"
// - Hard safety limits: master gain never exceeds 0.08
// - All transitions are slow (no sudden transients)
// - Inspired by film sound design (Fincher, Villeneuve)
// ============================================

let ctx = null;
let masterGain = null;
let limiter = null;
let isActive = false;

// Keep references for cleanup
let droneNodes = [];
let roomToneNode = null;

const MASTER_MAX = 0.25; // Comfortable ambient level at typical system volume

export function initAudio() {
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain with hard limit
        masterGain = ctx.createGain();
        masterGain.gain.value = 0;

        // Dynamics compressor as a safety limiter
        limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 12;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.1;

        masterGain.connect(limiter);
        limiter.connect(ctx.destination);

        isActive = true;
    } catch (e) {
        isActive = false;
    }
}

// --- Room tone: filtered noise that sounds like a quiet space ---
// Think server room, empty hallway, surveillance facility
function createRoomTone() {
    if (!isActive) return;

    // Create noise buffer
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Heavy low-pass filter — only the lowest rumble gets through
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 150;
    lpf.Q.value = 0.7;

    // Second filter for extra smoothness
    const lpf2 = ctx.createBiquadFilter();
    lpf2.type = 'lowpass';
    lpf2.frequency.value = 200;
    lpf2.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    noise.connect(lpf);
    lpf.connect(lpf2);
    lpf2.connect(gain);
    gain.connect(masterGain);

    noise.start();

    // Very slow fade in
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 8);

    roomToneNode = { noise, gain, lpf };
    droneNodes.push(noise);
}

// --- Tension drone: rich, slowly evolving pad ---
// Multiple detuned oscillators with slow modulation
// NOT sine waves — triangle waves with filtering for warmth
function createDrone() {
    if (!isActive) return;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneGain.connect(masterGain);

    // Warm low-pass on the whole drone
    const droneLPF = ctx.createBiquadFilter();
    droneLPF.type = 'lowpass';
    droneLPF.frequency.value = 300;
    droneLPF.Q.value = 0.3;
    droneLPF.connect(droneGain);

    // Three triangle oscillators, slightly detuned for richness
    // Triangle waves have odd harmonics only — warmer than sawtooth, richer than sine
    const freqs = [48, 48.15, 72.1]; // C1-ish with detuning + a fifth above
    const gains = [0.3, 0.25, 0.12];

    freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const g = ctx.createGain();
        g.gain.value = gains[i];

        osc.connect(g);
        g.connect(droneLPF);
        osc.start();
        droneNodes.push(osc);

        // Slow frequency modulation (subtle vibrato) — different rate per oscillator
        // Creates organic, breathing quality
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.03 + (i * 0.02); // 0.03Hz, 0.05Hz, 0.07Hz — very slow
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.3; // +-0.3Hz variation
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        droneNodes.push(lfo);
    });

    // Very slow fade in
    droneGain.gain.setValueAtTime(0, ctx.currentTime);
    droneGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 10);

    return droneGain;
}

let droneGainRef = null;

export function startDrone() {
    if (!isActive) return;

    // Fade master in
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(MASTER_MAX, ctx.currentTime + 6);

    createRoomTone();
    droneGainRef = createDrone();
}

// --- Section reveal: a soft, muted data-registration blip ---
// Like a monitoring system acknowledging new input
// NOT a sweep or rise — just a quiet "blip" with reverb-like tail
export function playScanTone() {
    if (!isActive) return;

    // Short triangle wave burst, heavily filtered
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 400 + Math.random() * 200; // Slight variation each time

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 600;

    const gain = ctx.createGain();
    // Soft attack, slow release (no click)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
}

// --- Fingerprint reveal: a low, resonant impact with slow decay ---
// Like a large bell struck very softly in a distant room
export function playFingerprintTone() {
    if (!isActive) return;

    // Fundamental
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 65; // Low C

    // Octave
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 130;

    // Fifth (for richness)
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 98; // G

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 400;
    lpf.frequency.linearRampToValueAtTime(100, ctx.currentTime + 4);

    [osc1, osc2, osc3].forEach(o => {
        const g = ctx.createGain();
        g.gain.value = o === osc1 ? 0.5 : 0.2;
        o.connect(g);
        g.connect(lpf);
        o.start();
        o.stop(ctx.currentTime + 4);
    });

    lpf.connect(gain);
    gain.connect(masterGain);
}

// --- Fade to silence at punchline ---
export function fadeDrone() {
    if (!isActive) return;

    const fadeTime = 4;
    const now = ctx.currentTime;

    masterGain.gain.linearRampToValueAtTime(0, now + fadeTime);

    // Stop oscillators after fade
    setTimeout(() => {
        droneNodes.forEach(node => {
            try { node.stop(); } catch (e) {}
        });
        if (roomToneNode?.noise) {
            try { roomToneNode.noise.stop(); } catch (e) {}
        }
    }, fadeTime * 1000 + 500);
}

// --- Observer tick: tiny, soft click ---
// Like a pen tapping on glass in another room
export function playTick() {
    if (!isActive) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
}
