// ============================================
// ui.js — UI animations, reveals, and helpers
// ============================================

// --- Format huge numbers for display ---
export function formatHugeNumber(n) {
    if (n >= 1e30) return `${(n / 1e30).toFixed(1)} nonillion`;
    if (n >= 1e27) return `${(n / 1e27).toFixed(1)} octillion`;
    if (n >= 1e24) return `${(n / 1e24).toFixed(1)} septillion`;
    if (n >= 1e21) return `${(n / 1e21).toFixed(1)} sextillion`;
    if (n >= 1e18) return `${(n / 1e18).toFixed(1)} quintillion`;
    if (n >= 1e15) return `~${(n / 1e15).toFixed(1)} quadrillion`;
    if (n >= 1e12) return `~${(n / 1e12).toFixed(1)} trillion`;
    if (n >= 1e9) return `~${(n / 1e9).toFixed(1)} billion`;
    if (n >= 1e6) return `~${(n / 1e6).toFixed(1)} million`;
    return `~${Math.round(n).toLocaleString()}`;
}

// Stagger counter for data lines
let staggerCount = 0;

export function resetStagger() {
    staggerCount = 0;
}

function nextStagger() {
    staggerCount++;
    return Math.min(staggerCount, 8);
}

// --- Create a narrative data line ---
export function narrate(html) {
    const div = document.createElement('div');
    div.className = `data-line stagger-${nextStagger()}`;
    div.innerHTML = `<p class="data-narrative">${html}</p>`;
    return div;
}

// --- Create a comment line ---
export function comment(text) {
    const div = document.createElement('div');
    div.className = `data-line stagger-${nextStagger()}`;
    div.innerHTML = `<p class="data-comment">${text}</p>`;
    return div;
}

// --- Create a technical aside ---
export function aside(text) {
    const div = document.createElement('div');
    div.className = `data-line stagger-${nextStagger()}`;
    div.innerHTML = `<div class="data-aside">${text}</div>`;
    return div;
}

// --- Create a section divider ---
export function divider() {
    const div = document.createElement('div');
    div.className = `data-line stagger-${nextStagger()}`;
    div.innerHTML = '<div class="section-divider"></div>';
    return div;
}

// --- Highlight a value inline ---
export function val(text) {
    return `<span class="data-value">${text}</span>`;
}

// --- Create hash display with character-by-character reveal ---
export function createHashDisplay(hash, fast = false) {
    const container = document.createElement('div');
    container.className = `data-line stagger-${nextStagger()}`;

    const hashDiv = document.createElement('div');
    hashDiv.className = 'hash-display';

    for (let i = 0; i < hash.length; i++) {
        const span = document.createElement('span');
        span.className = 'hash-char';
        span.textContent = hash[i];
        hashDiv.appendChild(span);
    }

    container.appendChild(hashDiv);

    // Reveal characters with stagger
    requestAnimationFrame(() => {
        const chars = hashDiv.querySelectorAll('.hash-char');
        const delay = fast ? 8 : 20;
        chars.forEach((ch, i) => {
            setTimeout(() => ch.classList.add('is-visible'), i * delay);
        });
    });

    return container;
}

// --- Create large fingerprint hash display ---
export function createFingerprintDisplay(hash) {
    const container = document.createElement('div');
    container.className = `data-line stagger-${nextStagger()}`;

    const hashDiv = document.createElement('div');
    hashDiv.className = 'fingerprint-hash';

    for (let i = 0; i < hash.length; i++) {
        const span = document.createElement('span');
        span.className = 'hash-char';
        span.textContent = hash[i];
        hashDiv.appendChild(span);
    }

    container.appendChild(hashDiv);

    return { container, reveal: () => {
        const chars = hashDiv.querySelectorAll('.hash-char');
        chars.forEach((ch, i) => {
            setTimeout(() => ch.classList.add('is-visible'), i * 35);
        });
    }};
}

// --- Create the entropy table ---
export function createEntropyTable(rows, totalBits, totalUniqueness) {
    const container = document.createElement('div');
    container.className = `data-line stagger-${nextStagger()}`;

    const wrap = document.createElement('div');
    wrap.className = 'entropy-table-wrap';

    const formattedTotal = formatHugeNumber(totalUniqueness);

    wrap.innerHTML = `
        <table class="entropy-table">
            <thead>
                <tr>
                    <th>Signal</th>
                    <th>Your value</th>
                    <th>Uniqueness</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => `
                    <tr>
                        <td class="signal-name">${r.signal}</td>
                        <td class="signal-value">${r.value}</td>
                        <td class="signal-uniqueness">${r.uniqueness}</td>
                    </tr>
                `).join('')}
                <tr class="combined-row">
                    <td>Combined</td>
                    <td>${totalBits.toFixed(1)} bits of entropy</td>
                    <td>1 in ${formattedTotal}</td>
                </tr>
            </tbody>
        </table>
    `;

    container.appendChild(wrap);
    return container;
}

// --- Create font grid ---
export function createFontGrid(fonts, devFonts, adobeFonts, designFonts) {
    const container = document.createElement('div');
    container.className = `data-line stagger-${nextStagger()}`;

    const grid = document.createElement('div');
    grid.className = 'font-grid';

    const highlightSet = new Set([...devFonts, ...adobeFonts, ...designFonts]);

    fonts.forEach((font, i) => {
        const tag = document.createElement('span');
        tag.className = 'font-tag';
        if (highlightSet.has(font)) tag.classList.add('highlight');
        tag.textContent = font;
        tag.style.animationDelay = `${Math.min(i * 15, 2000)}ms`;
        grid.appendChild(tag);
    });

    container.appendChild(grid);
    return container;
}

// --- VPN callout ---
export function createVPNCallout(reason) {
    const div = document.createElement('div');
    div.className = `data-line stagger-${nextStagger()}`;
    div.innerHTML = `
        <div class="vpn-callout">
            <p class="data-narrative" style="color: var(--danger)">
                You\u2019re using a VPN. ${reason} Nice try, though.
            </p>
        </div>
    `;
    return div;
}

// --- DNT callout ---
export function createDNTCallout() {
    const div = document.createElement('div');
    div.className = `data-line stagger-${nextStagger()}`;
    div.innerHTML = `
        <div class="dnt-callout">
            <p class="data-narrative">
                You have <em>Do Not Track</em> enabled. Ironic twist: only a small percentage of users enable it,
                which actually makes you <em>more</em> identifiable, not less.
            </p>
        </div>
    `;
    return div;
}

// --- Section reveal orchestration ---

const sectionQueue = [];
let currentlyRevealing = false;
let onRevealCallback = null;

export function setOnReveal(fn) {
    onRevealCallback = fn;
}

export function queueSectionReveal(sectionId, buildFn, delay = 1200) {
    sectionQueue.push({ sectionId, buildFn, delay });
}

export function setupScrollReveals() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const section = entry.target;
                if (!section.classList.contains('is-visible')) {
                    revealSection(section);
                }
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px',
    });

    const sections = document.querySelectorAll('.section--reveal');
    const sectionList = [...sections];

    sections.forEach((section, i) => {
        observer.observe(section);

        // Add scroll cue arrow (skip the last section — nowhere to go)
        if (i === sectionList.length - 1) return;

        const cue = document.createElement('button');
        cue.className = 'scroll-cue';
        cue.textContent = '\u2193';
        cue.setAttribute('aria-label', 'Scroll to next section');
        cue.addEventListener('click', () => {
            const next = sectionList[i + 1];
            if (next) {
                next.scrollIntoView({ behavior: 'smooth' });
            }
        });
        section.appendChild(cue);
    });
}

async function revealSection(section) {
    const sectionId = section.dataset.section;
    section.classList.add('is-visible');

    // Find the queued build function
    const queued = sectionQueue.find(q => q.sectionId === sectionId);
    if (!queued) return;

    // Build content immediately (invisible — opacity: 0 via .section-content)
    // This establishes the full height before any animation starts
    resetStagger();
    queued.buildFn();

    // Show scanning indicator (overlaid, doesn't affect layout)
    section.classList.add('is-scanning');

    // Notify callback (for audio)
    if (onRevealCallback) onRevealCallback(sectionId, 'scanning');

    // Wait for scan animation
    await sleep(queued.delay);

    // Notify callback (for audio)
    if (onRevealCallback) onRevealCallback(sectionId, 'revealed');

    // Transition from scanning to revealed — content fades in
    section.classList.remove('is-scanning');
    section.classList.add('is-revealed');
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
