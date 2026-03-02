import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyABth8qpCPCFttp-xsbF43eUk3QINzXSz8",
    authDomain: "szeboon-suyanti.firebaseapp.com",
    projectId: "szeboon-suyanti",
    storageBucket: "szeboon-suyanti.firebasestorage.app",
    messagingSenderId: "553099138986",
    appId: "1:553099138986:web:454b6e574b0b95ceaabdd3",
    measurementId: "G-5NZV5BZV9F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
function formatTime(d) {
    if (!d) return "";
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

// ===== Cover =====
const cover = document.getElementById("cover");
document.getElementById("openBtn")?.addEventListener("click", () => {
    cover?.classList.add("hidden");
});

// ===== Receiver from link (?to=) =====
const toLine = document.getElementById("toLine");
const toName = document.getElementById("toName");
const gbName = document.getElementById("gbName");

const to = getParam("to");
if (to && to.trim()) {
    toName.textContent = to.trim();
    toLine.style.display = "block";
    gbName.value = to.trim();
} else {
    toLine.style.display = "none";
}

// ===== Reveal =====
const revealEls = Array.from(document.querySelectorAll(".reveal"));
const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("is-visible");
    });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// ===== Countdown =====
const EVENT_ISO = "2026-03-28T18:30:00+07:00";
const eventTime = new Date(EVENT_ISO);

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

// ===== Guestbook (Firestore shared) =====
const form = document.getElementById("guestbookForm");
const msgEl = document.getElementById("gbMsg");
const countEl = document.getElementById("gbCount");
const listEl = document.getElementById("gbList");
const metaEl = document.getElementById("gbMeta");
const statusEl = document.getElementById("gbStatus");
const submitBtn = document.getElementById("gbSubmit");

function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
}
function updateCount() {
    if (countEl) countEl.textContent = String(msgEl.value.length);
}
msgEl?.addEventListener("input", updateCount);
updateCount();

function renderList(items) {
    metaEl.textContent = `${items.length} ucapan`;

    if (items.length === 0) {
        listEl.innerHTML = `<div class="muted" style="padding:10px 2px;">Belum ada ucapan.</div>`;
        return;
    }

    listEl.innerHTML = items.map(it => {
        const name = escapeHTML(it.name);
        const msg = escapeHTML(it.message);
        const time = it.createdAt ? formatTime(it.createdAt) : "";
        return `
      <div class="gb-item">
        <div class="gb-top">
          <div class="gb-name">${name}</div>
          <div class="gb-time">${escapeHTML(time)}</div>
        </div>
        <div class="gb-msg">${msg}</div>
      </div>
    `;
    }).join("");
}

// Realtime listener (last 50)
const q = query(collection(db, "guestbook"), orderBy("createdAt", "desc"), limit(50));
onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(doc => {
        const d = doc.data();
        items.push({
            name: d.name || "",
            message: d.message || "",
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : null
        });
    });
    renderList(items);
}, (err) => {
    console.error(err);
    setStatus("Gagal memuat ucapan. Coba refresh.");
});

form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = gbName.value.trim();
    const message = msgEl.value.trim();

    if (!name || !message) {
        setStatus("Nama dan ucapan tidak boleh kosong.");
        return;
    }

    submitBtn.disabled = true;
    setStatus("Mengirim...");

    try {
        await addDoc(collection(db, "guestbook"), {
            name,
            message,
            createdAt: serverTimestamp()
        });

        msgEl.value = "";
        updateCount();
        setStatus("Terkirim ✅");
        setTimeout(() => setStatus(""), 1400);
    } catch (err) {
        console.error(err);
        setStatus("Gagal mengirim. Coba lagi ya.");
    } finally {
        submitBtn.disabled = false;
    }
});

// ===== Copy rekening + toast =====
const copyBtn = document.getElementById("copyAccBtn");
const copyToast = document.getElementById("copyToast");

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

function showToast() {
    if (!copyToast) return;
    copyToast.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => copyToast.classList.remove("show"), 1600);
}

copyBtn?.addEventListener("click", async () => {
    const num = copyBtn.getAttribute("data-copy") || "1440417341";
    try {
        await copyText(num);
        showToast();
    } catch (e) {
        alert("Gagal menyalin. Silakan copy manual: " + num);
    }
});