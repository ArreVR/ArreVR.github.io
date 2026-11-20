// ============ Your download links (empty = "Coming soon") ============
const DOWNLOADS = {
  windows: "https://github.com/ArreVR/Game/releases/latest", // the IsIT Launcher
  linux: "",
  // The phone version: the APK in the GitHub release "android" (the app updates itself from there). The card switches
  // itself on as soon as that release has IsIT.apk (see below), so the link is never dead.
  android: "https://github.com/ArreVR/Game/releases/download/android/IsIT.apk"
};
const ANDROID_RELEASE_API = "https://api.github.com/repos/ArreVR/Game/releases/tags/android";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ============ The shaky ink: new noise 12 times a second (the game draws on twos) ============
const noises = [document.getElementById("boilNoise"), document.getElementById("boilNoiseBig")];
let boilFrame = 0;
if (!reduceMotion) {
  setInterval(() => {
    boilFrame = (boilFrame + 1) % 3;
    noises.forEach(n => n.setAttribute("seed", String(boilFrame * 7 + 1)));
  }, 83);
}

// ============ Torn paper edges (they shake too) ============
function tornEdge(side, variant) {
  let x = Math.sin(variant * 99.1) * 1000; // a fixed "random" per variant, so the shapes repeat
  const rnd = () => { x = Math.sin(x) * 10000; return x - Math.floor(x); };
  const pts = [];
  const steps = 26;
  if (side === "right") {
    pts.push("0 0");
    const n = 16;
    for (let i = 0; i <= n; i++) pts.push(`calc(100% - ${Math.round(rnd() * 46)}px) ${(i / n * 100).toFixed(1)}%`);
    pts.push("0 100%");
  } else if (side === "bottom") {
    pts.push("0 0", "100% 0");
    for (let i = steps; i >= 0; i--) pts.push(`${(i / steps * 100).toFixed(1)}% calc(100% - ${Math.round(rnd() * 22)}px)`);
  } else if (side === "top") { // a strip of paper whose bottom edge is torn
    pts.push("0 0", "100% 0");
    for (let i = steps * 2; i >= 0; i--) pts.push(`${(i / steps / 2 * 100).toFixed(1)}% ${Math.round(25 + rnd() * 75)}%`);
  } else { // up: a strip of paper whose top edge is torn
    pts.push("0 100%", "100% 100%");
    for (let i = steps * 2; i >= 0; i--) pts.push(`${(i / steps / 2 * 100).toFixed(1)}% ${Math.round(rnd() * 75)}%`);
  }
  return `polygon(${pts.join(",")})`;
}
// Every dark section gets torn paper above and below it (the footer only above).
document.querySelectorAll(".doodle-section, .footer").forEach(section => {
  for (const pos of section.classList.contains("footer") ? ["top"] : ["top", "bottom"]) {
    const edge = document.createElement("div");
    edge.className = `edge edge-${pos}`;
    edge.dataset.tear = pos === "top" ? "top" : "up";
    section.appendChild(edge);
  }
});
const tears = document.querySelectorAll("[data-tear]");
let tearVariant = 0;
function drawTears() {
  const narrow = window.innerWidth <= 900;
  tears.forEach((el, i) => {
    let side = el.dataset.tear;
    if (side === "right" && narrow) side = "bottom";
    el.style.clipPath = tornEdge(side, tearVariant + i * 5); // each torn edge its own shape (the hero's paper sticks out from under the ink)
  });
}
drawTears();
window.addEventListener("resize", drawTears);
if (!reduceMotion) setInterval(() => { tearVariant = (tearVariant + 1) % 3; drawTears(); }, 250);

// ============ Intro (once per visit) ============
const intro = document.getElementById("intro");
function endIntro() { intro.classList.add("gone"); setTimeout(() => intro.remove(), 700); }
let seenIntro = false;
try { seenIntro = sessionStorage.getItem("isit-intro") === "1"; sessionStorage.setItem("isit-intro", "1"); } catch (e) { /* private mode */ }
if (seenIntro || reduceMotion) intro.remove();
else {
  intro.addEventListener("click", endIntro);
  setTimeout(endIntro, 2300);
}

// ============ Downloads: real link or "Coming soon", and the visitor's own system ============
const osNames = { windows: "WINDOWS", linux: "LINUX", android: "ANDROID" };
function detectOS() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return null;
}
const myOS = detectOS();
function cardReady(card, url) {
  card.classList.remove("soon");
  card.href = url;
  card.target = "_blank";
  card.rel = "noopener";
  card.querySelector(".dl-label").textContent = "DOWNLOAD";
}
function cardSoon(card, os) {
  card.classList.add("soon");
  card.removeAttribute("href");
  card.querySelector(".dl-label").textContent = "COMING SOON";
  card.addEventListener("click", e => {
    if (card.classList.contains("soon")) { e.preventDefault(); toast(`IsIT for ${osNames[os]} is on the way!`); }
  });
}
document.querySelectorAll(".dl").forEach(card => {
  const os = card.dataset.os;
  const url = DOWNLOADS[os];
  if (os === myOS) card.classList.add("mine");
  if (!url) { cardSoon(card, os); return; }
  if (os !== "android") { cardReady(card, url); return; }
  // Android: only once the APK is really in the release (else "Coming soon").
  cardSoon(card, os);
  fetch(ANDROID_RELEASE_API, { headers: { Accept: "application/vnd.github+json" } })
    .then(r => (r.ok ? r.json() : null))
    .then(release => {
      const apk = release && (release.assets || []).find(a => a.name === "IsIT.apk");
      if (!apk) return;
      cardReady(card, apk.browser_download_url || url);
      const note = card.querySelector("p");
      if (note) note.textContent = `Phones and tablets · ${Math.round(apk.size / 1048576)} MB · updates itself`;
      if (myOS === "android") document.getElementById("heroDownloadText").textContent = "PLAY ON ANDROID";
    })
    .catch(() => { /* offline or GitHub busy: stays "Coming soon" */ });
});
if (myOS && myOS !== "android" && DOWNLOADS[myOS]) document.getElementById("heroDownloadText").textContent = `PLAY ON ${osNames[myOS]}`;

// ============ Phone menu ============
const navLinks = document.getElementById("navLinks");
document.getElementById("burger").addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

// ============ What's inside: tabs, cards and the arrow keys ============
const tabs = [...document.querySelectorAll(".tab")];
const pages = [...document.querySelectorAll(".page")];
const cards = [...document.querySelectorAll(".card")];
let current = 0;
function showTab(i) {
  current = (i + tabs.length) % tabs.length;
  tabs.forEach((t, k) => t.classList.toggle("active", k === current));
  pages.forEach((p, k) => p.classList.toggle("active", k === current));
  cards.forEach((c, k) => c.classList.toggle("on", k === current));
}
tabs.forEach((t, i) => t.addEventListener("click", () => showTab(i)));
cards.forEach(c => c.addEventListener("click", () => {
  showTab(+c.dataset.go);
  document.getElementById("tabs").scrollIntoView({ behavior: "smooth", block: "center" });
}));
document.addEventListener("keydown", e => {
  const box = document.getElementById("inside").getBoundingClientRect();
  const inView = box.top < window.innerHeight * 0.6 && box.bottom > window.innerHeight * 0.4;
  if (!inView || document.getElementById("lightbox").classList.contains("open")) return;
  if (e.key === "ArrowRight") showTab(current + 1);
  if (e.key === "ArrowLeft") showTab(current - 1);
});
showTab(0);

// ============ Pop in while scrolling ============
const seen = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add("in");
  seen.unobserve(en.target);
}), { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 6) * 60}ms`;
  seen.observe(el);
});

// ============ Counters ============
const counted = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  const el = en.target, goal = +el.dataset.count, start = performance.now();
  const tick = now => {
    const t = Math.min((now - start) / 1100, 1);
    el.textContent = Math.round(goal * (1 - Math.pow(1 - t, 3))) + (t === 1 && goal >= 100 ? "+" : "");
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  counted.unobserve(el);
}), { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach(el => counted.observe(el));

// ============ FAQ ============
document.querySelectorAll(".q").forEach(q => {
  const body = q.querySelector(".q-body");
  q.querySelector(".q-head").addEventListener("click", () => {
    const open = q.classList.toggle("open");
    body.style.maxHeight = open ? body.scrollHeight + "px" : "0";
  });
});

// ============ Screenshot viewer ============
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
document.querySelectorAll(".shot").forEach(s => s.addEventListener("click", () => {
  const img = s.querySelector("img");
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightbox.classList.add("open");
}));
const closeBox = () => lightbox.classList.remove("open");
lightbox.addEventListener("click", e => { if (e.target === lightbox || e.target.closest(".lightbox-close")) closeBox(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeBox(); });

// ============ Back to top ============
const toTop = document.getElementById("toTop");
window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 700));
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ============ A little message ============
function toast(text) {
  const box = document.createElement("div");
  box.className = "ink";
  box.textContent = text;
  Object.assign(box.style, {
    position: "fixed", left: "50%", bottom: "34px", transform: "translateX(-50%) rotate(-2deg)", zIndex: 160,
    padding: "14px 26px", fontFamily: "IsITInk, Fredoka, sans-serif", fontSize: "20px"
  });
  box.style.setProperty("--fill", "#fad975");
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}

document.getElementById("year").textContent = new Date().getFullYear();
