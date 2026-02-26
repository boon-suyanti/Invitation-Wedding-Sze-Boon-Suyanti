// ===== Helpers =====
function pad2(n) { return String(n).padStart(2, "0"); }

function escapeHTML(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatTime(ts) {
    const d = new Date(ts);
    // format simple: DD/MM/YYYY HH:MM
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// ====== Event time (WIB) ======
const EVENT_ISO = "2026-03-28T18:30:00+07:00";
const eventTime = new Date(EVENT_ISO);

// ===== Cover open =====
const cover = document.getElementById("cover");
const openBtn = document.getElementById("openBtn");

openBtn.addEventListener("click", () => {
    cover.classList.add("hidden");
});

// ===== Receiver from link (?to=) =====
const toLine = document.getElementById("toLine");
const toName = document.getElementById("toName");
const gbName = document.getElementById("gbName");

const to = getParam("to");
if (to && to.trim()) {
    toName.textContent = to.trim();
    toLine.style.display = "block";
    // prefill nama form (opsional)
    gbName.value = to.trim();
} else {
    toLine.style.display = "none";
}

// ===== Reveal on scroll =====
const revealEls = Array.from(document.querySelectorAll(".reveal"));
const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("is-visible");
    });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// ===== Countdown =====
const dEl = document.getElementById("d");
const hEl = document.getElementById("h");
const mEl = document.getElementById("m");
const sEl = document.getElementById("s");

function tickCountdown() {
    const now = new Date();
    let diff = eventTime - now;

    if (diff <= 0) {
        dEl.textContent = "00";
        hEl.textContent = "00";
        mEl.textContent = "00";
        sEl.textContent = "00";
        return;
    }

    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / (3600 * 24));
    const hours = Math.floor((sec % (3600 * 24)) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    dEl.textContent = pad2(days);
    hEl.textContent = pad2(hours);
    mEl.textContent = pad2(mins);
    sEl.textContent = pad2(secs);
}
tickCountdown();
setInterval(tickCountdown, 1000);

// ===== Guestbook (localStorage) =====
const STORE_KEY = "INV_GUESTBOOK_V1";
const form = document.getElementById("guestbookForm");
const msgEl = document.getElementById("gbMsg");
const countEl = document.getElementById("gbCount");
const listEl = document.getElementById("gbList");
const metaEl = document.getElementById("gbMeta");
const clearBtn = document.getElementById("gbClear");

function loadMessages() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function saveMessages(arr) {
    localStorage.setItem(STORE_KEY, JSON.stringify(arr));
}

function renderMessages() {
    const items = loadMessages().sort((a, b) => b.ts - a.ts);
    metaEl.textContent = `${items.length} ucapan`;

    if (items.length === 0) {
        listEl.innerHTML = `<div class="muted" style="padding:10px 2px;">Belum ada ucapan.</div>`;
        return;
    }

    listEl.innerHTML = items.map(it => {
        const name = escapeHTML(it.name);
        const msg = escapeHTML(it.message);
        const time = escapeHTML(formatTime(it.ts));
        return `
      <div class="gb-item">
        <div class="gb-top">
          <div class="gb-name">${name}</div>
          <div class="gb-time">${time}</div>
        </div>
        <div class="gb-msg">${msg}</div>
      </div>
    `;
    }).join("");
}

function updateCount() {
    countEl.textContent = String(msgEl.value.length);
}
msgEl.addEventListener("input", updateCount);
updateCount();
renderMessages();

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = gbName.value.trim();
    const message = msgEl.value.trim();

    if (!name || !message) return;

    const arr = loadMessages();
    arr.push({ name, message, ts: Date.now() });
    saveMessages(arr);

    msgEl.value = "";
    updateCount();
    renderMessages();

    // scroll ke list biar kelihatan
    document.querySelector(".gb-listWrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        localStorage.removeItem(STORE_KEY);
        renderMessages();
    });
}

// ===== Copy rekening =====
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#copyAccBtn");
    if (!btn) return;

    const num = btn.getAttribute("data-copy") || "1440417341";

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
    }

    const toast = document.getElementById("copyToast");
    const showToast = () => {
        if (!toast) return;
        toast.classList.add("show");
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
    };

    try {
        await copyText(num);
        showToast();
    } catch (err) {
        alert("Gagal menyalin. Silakan copy manual: " + num);
    }
});