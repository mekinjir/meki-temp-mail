"use strict";

/* ===== Semua teks, ikon, dan tampilan dirender dari sini ===== */
const IMG = "meki.png"; // taruh file meki.png di folder yang sama
const imgTag = (cls, alt) =>
  `<img class="${cls}" src="${IMG}" alt="${alt}" onerror="this.style.display='none'">`;

const UI = `
<header class="top">
 <a class="brand" href="#" aria-label="Meki Temp Mail">
  <span class="brandmark"><i class="fa-solid fa-inbox"></i></span>
  <span>MEKI<small>TEMP MAIL</small></span>
 </a>
 <nav class="nav" aria-label="Main navigation">
  <button class="active" data-tab="workspace">Workspace</button>
  <button data-tab="about">About</button>
 </nav>
 <div class="top-actions">
  <div class="connection"><span class="led" id="led"></span><span id="connectionText">NOT CONNECTED</span></div>
 </div>
</header>
<main>
 <section class="hero">
  <div class="hero-copy">
   <span class="tag"><i class="fa-solid fa-bolt"></i> DISPOSABLE INBOX / 001</span>
   <h1>INBOX<br>WITHOUT<br><span>THE NOISE.</span></h1>
   <p>Buat alamat email sementara, pantau pesan masuk, salin OTP, dan buka tautan verifikasi dari satu tempat. Ringkas, cepat, dan langsung dari browser.</p>
  </div>
  <div class="hero-stamp">
   <div class="stamp-top">MEKI TEMP MAIL / PRIVATE WORKSPACE</div>
   ${imgTag("stamp-img", "Meki")}
   <div class="stamp-big">Your inbox.<br>Your rules.</div>
   <div class="stamp-bottom">EMAIL TEMPORARY SERVICE</div>
  </div>
 </section>
 <section class="layout">
  <aside class="side">
   <div class="side-title">NAVIGATION</div>
   <button class="active" data-tab="workspace"><i class="fa-solid fa-layer-group"></i> Generator & Inbox</button>
   <div class="side-title">INFORMATION</div>
   <button data-tab="about"><i class="fa-regular fa-circle-question"></i> About service</button>
  </aside>
  <div class="panel">
   <section class="view active" id="tab-workspace">
    <div class="head">
     <div><h2>Email workspace</h2><p>Generate inbox baru atau cek pesan yang sudah masuk.</p></div>
     <button class="btn" id="refreshBtn"><i class="fa-solid fa-rotate"></i> Refresh</button>
    </div>
    <div class="address">
     <div class="address-top"><div class="label">ACTIVE EMAIL ADDRESS</div><div class="expiry" id="expiryTimer">BELUM ADA EMAIL</div></div>
     <div class="address-row">
      <div class="email" id="activeEmail">Belum ada alamat email</div>
      <div class="actions">
       <button class="btn" id="copyBtn" disabled><i class="fa-regular fa-copy"></i> Copy</button>
       <button class="btn pink" id="newBtn"><i class="fa-solid fa-plus"></i> New</button>
      </div>
     </div>
    </div>
    <div class="formrow">
     <input class="field" id="prefix" maxlength="24" placeholder="Username (opsional)" autocomplete="off">
     <button class="btn lime" id="generateBtn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate email</button>
    </div>
    <div class="hint">Kosongkan username untuk alamat acak.</div>
    <div class="stats">
     <div class="stat"><span>MESSAGES</span><b id="msgCount">0</b></div>
     <div class="stat"><span>OTP FOUND</span><b id="otpCount">0</b></div>
     <div class="stat"><span>LINKS FOUND</span><b id="linkCount">0</b></div>
    </div>
    <div class="toolbar">
     <h3><i class="fa-regular fa-envelope"></i> Incoming messages</h3>
     <div class="tools"><span class="tag" id="autoStatus"><i class="fa-solid fa-arrows-rotate"></i> AUTO REFRESH · 15 SEC</span></div>
    </div>
    <input class="field" id="searchMail" placeholder="Cari pengirim atau subjek..." style="margin-bottom:10px">
    <div class="list" id="messageList"></div>
    <div id="detail"></div>
    <div class="statusline" id="apiStatus">Menunggu koneksi API.</div>
    <div class="note">PENTING: Jangan gunakan email sementara untuk akun finansial, password reset penting, atau data pribadi. Provider gratis dapat menerapkan batas pembuatan dan masa berlaku inbox.</div>
   </section>
   <section class="view" id="tab-about">
    <div class="head"><div><h2>About MEKI TEMP MAIL</h2><p>Temporary inbox interface.</p></div></div>
    <div class="aboutgrid">
     <div class="aboutcard"><i class="fa-solid fa-at"></i><b>Instant email</b><p>Membuat inbox sementara melalui backend TempMail API.</p></div>
     <div class="aboutcard"><i class="fa-solid fa-inbox"></i><b>Live inbox</b><p>Memuat pesan baru, membuka detail email, dan pencarian inbox.</p></div>
     <div class="aboutcard"><i class="fa-solid fa-key"></i><b>OTP detector</b><p>Mendeteksi kode berdasarkan konteks verifikasi, bukan sembarang angka.</p></div>
     <div class="aboutcard"><i class="fa-solid fa-link"></i><b>Link extractor</b><p>Mengambil URL asli dari teks maupun atribut href pada HTML email.</p></div>
    </div>
    <div class="note">Email service menggunakan backend TempMail. Jangan bagikan token inbox karena token memberi akses ke pesan masuk.</div>
   </section>
  </div>
 </section>
</main>
<footer><span>© <span id="year"></span> MEKI TEMP MAIL</span><span>PRIVATE TEMPORARY INBOX</span></footer>
<div class="toast" id="toast"></div>
`;
document.getElementById("app").innerHTML = UI;

/* ===== Logic ===== */
const API = "https://api.tempmail.lol/v3", $ = id => document.getElementById(id);
const STORE = "meki_temp_mail_v4_current";
const DAY = 24 * 60 * 60 * 1000;
const state = { account: null, emails: [], auto: null, busy: false, refreshing: false, activeId: null, expiryTicker: null };

const EMPTY_HTML = (hasAccount) => `<div class="empty"><i class="fa-regular fa-envelope-open"></i><b>${hasAccount ? "Belum ada pesan masuk" : "Inbox masih kosong"}</b><span>${hasAccount ? "Pesan baru akan muncul setelah dikirim ke alamat ini." : "Generate alamat email untuk mulai menerima pesan."}</span></div>`;

function notify(t) { const e = $("toast"); e.textContent = t; e.classList.add("show"); clearTimeout(notify.timer); notify.timer = setTimeout(() => e.classList.remove("show"), 2600); }
function setConnection(mode, text) { $("led").className = "led " + (mode || ""); $("connectionText").textContent = text; }
function setStatus(text) { $("apiStatus").textContent = text; }
function escapeHTML(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function dateText(v) { if (!v) return "-"; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); }
function timeText(v) { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }); }

function stopTimers() {
  if (state.auto) clearInterval(state.auto);
  if (state.expiryTicker) clearInterval(state.expiryTicker);
  state.auto = null; state.expiryTicker = null;
}
function remainingMs() {
  if (!state.account) return 0;
  const expiry = Number(state.account.expires_at) || ((Number(state.account.created_at) || Date.now()) + DAY);
  return expiry - Date.now();
}
function updateCountdown() {
  if (!state.account) { $("expiryTimer").textContent = "BELUM ADA EMAIL"; return; }
  const left = remainingMs();
  if (left <= 0) { expireInbox(); return; }
  const total = Math.floor(left / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  $("expiryTimer").textContent = `EXPIRES ${h}:${m}:${s}`;
}
function expireInbox() {
  if (!state.account) return;
  stopTimers();
  state.account = null; state.emails = []; state.activeId = null;
  try { localStorage.removeItem(STORE); } catch {}
  renderAddress(); renderEmails(); renderStats(); $("detail").innerHTML = "";
  $("expiryTimer").textContent = "EXPIRED";
  $("generateBtn").disabled = false; $("newBtn").disabled = false;
  setConnection("bad", "INBOX EXPIRED");
  setStatus("Masa aktif 24 jam selesai. Token inbox lokal telah dihapus. Buat email baru untuk melanjutkan.");
  notify("Email kedaluwarsa. Silakan generate email baru.");
}
function startExpiryTicker() {
  if (state.expiryTicker) clearInterval(state.expiryTicker);
  updateCountdown();
  state.expiryTicker = setInterval(updateCountdown, 1000);
}
function startAutoRefresh() {
  if (state.auto) clearInterval(state.auto);
  if (!state.account) return;
  state.auto = setInterval(() => { if (document.visibilityState === "visible") refreshInbox(true); }, 15000);
  $("autoStatus").innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> AUTO REFRESH · 15 SEC';
  startExpiryTicker();
}
function expireIfNeeded() { if (state.account && remainingMs() <= 0) { expireInbox(); return true; } return false; }

function textOf(m) {
  if (m.body || m.text) return String(m.body || m.text);
  if (m.html) { const doc = new DOMParser().parseFromString(m.html, "text/html"); return doc.body.textContent || ""; }
  return "";
}
function otpFrom(s) {
  const text = String(s || "");
  const patterns = [
    /(?:otp|verification code|verify code|security code|login code|one.time password|kode verifikasi|kode otp|kode keamanan)[^\d]{0,40}(\d{4,8})/i,
    /(\d{4,8})[^\w]{0,20}(?:is your verification code|is your otp|your login code)/i
  ];
  for (const p of patterns) { const m = text.match(p); if (m) return m[1]; }
  return "";
}
function linksFromEmail(m) {
  const results = new Map();
  function add(raw, label = "") {
    try {
      const u = new URL(raw);
      if (!["http:", "https:"].includes(u.protocol)) return;
      if (!results.has(u.href)) results.set(u.href, { url: u.href, label: label || u.hostname });
    } catch {}
  }
  if (m.html) {
    const doc = new DOMParser().parseFromString(m.html, "text/html");
    doc.querySelectorAll("a[href]").forEach(a => add(a.getAttribute("href"), a.textContent.trim()));
  }
  (textOf(m).match(/https?:\/\/[^\s<>"')\]]+/gi) || []).forEach(url => add(url.replace(/[.,;!?]+$/, "")));
  return [...results.values()].slice(0, 20);
}
function safeEmailHTML(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,input,button,textarea,select,meta,link").forEach(n => n.remove());
  const allowed = ["p", "br", "div", "span", "b", "strong", "i", "em", "u", "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th", "blockquote", "hr", "h1", "h2", "h3", "h4"];
  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return escapeHTML(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    const content = [...node.childNodes].map(clean).join("");
    if (tag === "a") {
      let safe = "";
      try { const u = new URL(node.getAttribute("href") || ""); if (["http:", "https:"].includes(u.protocol)) safe = u.href; } catch {}
      return safe ? `<a href="${escapeHTML(safe)}" target="_blank" rel="noopener noreferrer">${content}</a>` : content;
    }
    if (!allowed.includes(tag)) return content;
    return tag === "br" || tag === "hr" ? `<${tag}>` : `<${tag}>${content}</${tag}>`;
  }
  return [...doc.body.childNodes].map(clean).join("");
}
async function request(path, opts = {}) {
  let res;
  try {
    res = await fetch(API + path, { ...opts, headers: { "Accept": "application/json", ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) } });
  } catch (e) {
    throw new Error("Tidak dapat menjangkau TempMail API (cek koneksi internet, atau API memblokir akses langsung dari browser). " + e.message);
  }
  let data = {}; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error?.message || data?.error || data?.message || ("HTTP " + res.status));
  return data;
}
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify({ account: state.account, emails: state.emails })); }
  catch { setStatus("Penyimpanan browser penuh atau dinonaktifkan."); }
}
function renderAddress() {
  $("activeEmail").textContent = state.account?.address || "Belum ada alamat email";
  $("copyBtn").disabled = !state.account;
  if (!state.account) $("expiryTimer").textContent = "BELUM ADA EMAIL";
}
function renderStats() {
  $("msgCount").textContent = state.emails.length;
  $("otpCount").textContent = state.emails.filter(m => otpFrom((m.subject || "") + " " + textOf(m))).length;
  $("linkCount").textContent = state.emails.reduce((n, m) => n + linksFromEmail(m).length, 0);
}
function renderEmails() {
  const q = $("searchMail").value.trim().toLowerCase();
  const arr = state.emails.filter(m => [m.subject, m.from, m.to, textOf(m)].join(" ").toLowerCase().includes(q));
  $("messageList").innerHTML = arr.length
    ? arr.map((m, i) => `<div class="mailrow" data-id="${escapeHTML(String(m.id ?? i))}"><div class="mailicon"><i class="fa-regular fa-envelope"></i></div><div class="mailinfo"><b>${escapeHTML(m.subject || "(Tanpa subjek)")}</b><span>${escapeHTML(m.from || "Pengirim tidak diketahui")} · ${escapeHTML(textOf(m).slice(0, 90))}</span></div><div class="mailtime">${timeText(m.date)}</div></div>`).join("")
    : EMPTY_HTML(!!state.account);
  $("messageList").querySelectorAll(".mailrow").forEach(row => row.addEventListener("click", () => openEmail(row.dataset.id)));
}
async function createInbox() {
  if (state.busy) return;
  const prefix = $("prefix").value.trim().toLowerCase();
  if (prefix && !/^[a-z0-9_-]{3,24}$/.test(prefix)) { notify("Username 3–24 karakter: huruf, angka, _ atau -"); return; }
  state.busy = true; $("generateBtn").disabled = true; $("newBtn").disabled = true;
  $("generateBtn").innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
  setStatus("Menghubungkan ke TempMail API...");
  try {
    const body = {}; if (prefix) body.prefix = prefix;
    const data = await request("/inboxes", { method: "POST", body: JSON.stringify(body) });
    if (!data.address || !data.token) throw new Error("Respons provider tidak berisi address/token.");
    stopTimers();
    const created = Date.now();
    state.account = { address: data.address, token: data.token, created_at: created, expires_at: created + DAY };
    state.emails = []; state.activeId = null; $("prefix").value = "";
    persist(); renderAddress(); renderEmails(); renderStats(); $("detail").innerHTML = "";
    setConnection("ok", "API CONNECTED"); setStatus("Inbox berhasil dibuat. Hitung mundur 24 jam dimulai.");
    startAutoRefresh(); await refreshInbox(true); notify("Email berhasil dibuat.");
  } catch (e) {
    setConnection("bad", "API ERROR"); setStatus(e.message); notify("Generate gagal: " + e.message);
  } finally {
    state.busy = false; $("generateBtn").disabled = false; $("newBtn").disabled = false;
    $("generateBtn").innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate email';
  }
}
async function refreshInbox(silent = false) {
  if (expireIfNeeded()) return;
  if (!state.account) { if (!silent) notify("Generate email dulu."); return; }
  if (state.refreshing) return;
  state.refreshing = true;
  try {
    const data = await request("/inboxes/" + encodeURIComponent(state.account.token) + "/emails?limit=100");
    if (data.expired) { setStatus("Provider menyatakan inbox sudah kedaluwarsa."); setConnection("bad", "INBOX EXPIRED"); return; }
    const incoming = Array.isArray(data.emails) ? data.emails : [];
    const key = (m, i) => String(m.id ?? (m.date + "-" + m.subject + "-" + i));
    const map = new Map(state.emails.map((m, i) => [key(m, i), m]));
    incoming.forEach((m, i) => map.set(key(m, i), m));
    state.emails = [...map.values()].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    persist(); renderEmails(); renderStats();
    setConnection("ok", "API CONNECTED"); setStatus("Inbox diperbarui · " + new Date().toLocaleTimeString("id-ID"));
    if (!silent) notify("Inbox diperbarui.");
  } catch (e) {
    setConnection("bad", "API ERROR"); setStatus(e.message); if (!silent) notify("Refresh gagal: " + e.message);
  } finally { state.refreshing = false; }
}
function openEmail(id) {
  const m = state.emails.find((x, i) => String(x.id ?? i) === String(id)); if (!m) return;
  state.activeId = id;
  const body = textOf(m), otp = otpFrom((m.subject || "") + " " + body), links = linksFromEmail(m);
  const renderedBody = m.html
    ? safeEmailHTML(m.html)
    : escapeHTML(body || "Isi email kosong.").replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  $("detail").innerHTML = `<article class="detail">
   <div style="display:flex;justify-content:space-between;gap:10px"><h3>${escapeHTML(m.subject || "(Tanpa subjek)")}</h3><button class="btn" id="closeDetail" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button></div>
   <div class="meta">FROM: ${escapeHTML(m.from || "-")}<br>TO: ${escapeHTML(m.to || state.account?.address || "-")}<br>DATE: ${escapeHTML(dateText(m.date))}</div>
   <div class="body">${renderedBody}</div>
   <div class="extract">
    <h4>DETECTED OTP</h4>
    <div class="chips">${otp ? `<button class="chip" id="copyOtp">${escapeHTML(otp)} · COPY</button>` : "<span class='muted'>Tidak ada OTP terdeteksi.</span>"}</div>
    <h4>EXTRACTED LINKS</h4>
    <div class="chips">${links.length ? links.map((link, i) => `<a class="chip" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.label || "LINK " + (i + 1))} ↗</a>`).join("") : "<span class='muted'>Tidak ada link ditemukan.</span>"}</div>
   </div>
   <div style="margin-top:12px"><button class="btn pink" id="removeEmail"><i class="fa-regular fa-trash-can"></i> Hapus dari tampilan</button></div>
  </article>`;
  $("closeDetail").onclick = () => $("detail").innerHTML = "";
  if (otp) $("copyOtp").onclick = () => copy(otp);
  $("removeEmail").onclick = () => { state.emails = state.emails.filter(x => x !== m); persist(); renderEmails(); renderStats(); $("detail").innerHTML = ""; notify("Pesan dihapus dari tampilan lokal."); };
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); notify("Berhasil disalin."); }
  catch {
    const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); notify("Berhasil disalin."); } catch { notify("Clipboard tidak tersedia."); }
    t.remove();
  }
}
function switchTab(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "tab-" + name));
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
}

/* ===== Init ===== */
document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
$("generateBtn").onclick = createInbox; $("newBtn").onclick = createInbox;
$("copyBtn").onclick = () => state.account && copy(state.account.address);
$("refreshBtn").onclick = () => refreshInbox();
$("searchMail").addEventListener("input", renderEmails);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && state.account) { if (!expireIfNeeded()) refreshInbox(true); } });
$("year").textContent = new Date().getFullYear();
renderEmails();

try {
  const saved = JSON.parse(localStorage.getItem(STORE) || "null");
  if (saved?.account?.token && saved?.account?.address) {
    const created = Number(saved.account.created_at) || Date.now();
    const expiry = Number(saved.account.expires_at) || created + DAY;
    if (expiry <= Date.now()) { localStorage.removeItem(STORE); }
    else {
      state.account = { ...saved.account, created_at: created, expires_at: expiry };
      state.emails = Array.isArray(saved.emails) ? saved.emails : [];
      renderAddress(); renderEmails(); renderStats(); setConnection("", "SESSION RESTORED");
      setStatus("Sesi inbox dipulihkan. Memuat pesan terbaru...");
      startAutoRefresh(); refreshInbox(true);
    }
  }
} catch { setStatus("Sesi tersimpan tidak dapat dibaca. Generate inbox baru."); }
if (!state.account) renderAddress();
