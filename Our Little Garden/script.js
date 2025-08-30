console.log("Script.js is loading!");
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// -------------------------------------------------
// 1. Replace with your Firebase config
// -------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDUowoiLT8UHG5msP7O2fk6K8eszzbNkuQ",
  authDomain: "our-little-garden-89b80.firebaseapp.com",
  projectId: "our-little-garden-89b80",
  storageBucket: "our-little-garden-89b80.firebasestorage.app",
  messagingSenderId: "943021053145",
  appId: "1:943021053145:web:3fd4b076d96a0deab6dac8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let gardenCode = null;
let userName = null;
let currentMood = null;

// -------------------------------------------------
// 2. Auth + presence helpers
// -------------------------------------------------
async function ensureAuth() {
  return new Promise((res) => {
    onAuthStateChanged(auth, (user) => {
      if (user) return res(user);
      signInAnonymously(auth).then(res);
    });
  });
}

// -------------------------------------------------
// 3. Create / Join garden
// -------------------------------------------------
async function createGarden() {
  const name = getUserName();
  if (!name) return;
  await ensureAuth();

  // 6-letter random code
  gardenCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  await setDoc(doc(db, "gardens", gardenCode), {
    createdAt: serverTimestamp(),
    users: [name],
  });
  localStorage.setItem("gardenCode", gardenCode);
  localStorage.setItem("userName", name);
  enterApp(gardenCode);
}

async function joinGarden() {
  const code = document.getElementById("joinCode").value.trim().toUpperCase();
  const name = getUserName();
  if (!code || !name) return alert("Code & name required");
  await ensureAuth();

  const docSnap = await getDoc(doc(db, "gardens", code));
  if (!docSnap.exists()) return alert("Garden not found");

  gardenCode = code;
  localStorage.setItem("gardenCode", code);
  localStorage.setItem("userName", name);
  enterApp(code);
}

function getUserName() {
  const n = document.getElementById("userName").value.trim();
  if (!n) alert("Please enter your name");
  return n;
}

async function enterApp(code) {
  gardenCode = code;
  userName = localStorage.getItem("userName");
  document.getElementById("setupScreen").style.display = "none";
  document.getElementById("mainApp").style.display = "block";
  document.getElementById("gardenName").textContent = `Garden: ${code}`;
  document.getElementById("gardenCodeDisplay").textContent = code;

  loadMoods();
  loadMemories();
  loadJournals();
}

// -------------------------------------------------
// 4. Moods
// -------------------------------------------------
function selectMood(el, emoji, label) {
  [...document.querySelectorAll(".mood-item")].forEach((x) =>
    x.classList.remove("selected")
  );
  el.classList.add("selected");
  currentMood = { emoji, label };
}

async function saveMood() {
  if (!currentMood) return alert("Pick a mood first!");
  await addDoc(collection(db, "gardens", gardenCode, "moods"), {
    user_name: userName,
    emoji: currentMood.emoji,
    label: currentMood.label,
    created_at: serverTimestamp(),
  });
  showSuccess(`Mood saved! ${currentMood.emoji}`);
}

function loadMoods() {
  const q = query(
    collection(db, "gardens", gardenCode, "moods"),
    orderBy("created_at", "desc"),
    limit(10)
  );
  onSnapshot(q, (snap) => {
    const arr = snap.docs.map((d) => d.data());
    document.getElementById("totalMoods").textContent = arr.length;
    const html = arr
      .slice(0, 5)
      .map(
        (m) => `
      <span style="display:inline-block;margin:5px;padding:10px;background:rgba(255,255,255,.9);border-radius:15px;">
        ${m.emoji} ${m.user_name}
      </span>`
      )
      .join("");
    document.getElementById("recentMoods").innerHTML =
      '<h3 style="color:#a569bd;margin-bottom:15px;">Recent Moods</h3>' + html;
  });
}

// -------------------------------------------------
// 5. Memories
// -------------------------------------------------
async function addMemory() {
  const text = prompt("Share a special memory: 💕");
  if (!text?.trim()) return;
  await addDoc(collection(db, "gardens", gardenCode, "memories"), {
    user_name: userName,
    text,
    mood: currentMood
      ? `${currentMood.emoji} ${currentMood.label}`
      : "💫 Special",
    created_at: serverTimestamp(),
  });
  showSuccess("Memory added! 📸✨");
}

function loadMemories() {
  const q = query(
    collection(db, "gardens", gardenCode, "memories"),
    orderBy("created_at", "desc")
  );
  onSnapshot(q, (snap) => {
    const arr = snap.docs.map((d) => d.data());
    document.getElementById("totalMemories").textContent = arr.length;
    document.getElementById("memoryWall").innerHTML = arr
      .map(
        (m) => `
      <div class="memory-card">
        <div class="memory-date">${m.user_name} – ${new Date(
          m.created_at?.toDate()
        ).toLocaleDateString()}</div>
        <div class="memory-text">${m.text}</div>
        <div class="memory-mood">${m.mood}</div>
      </div>`
      )
      .join("");
  });
}

// -------------------------------------------------
// 6. Journals
// -------------------------------------------------
async function saveJournalEntry() {
  const text = document.getElementById("journalText").value.trim();
  const prompt = document.getElementById("journalPrompt").textContent;
  if (!text) return alert("Write something first!");
  await addDoc(collection(db, "gardens", gardenCode, "journals"), {
    user_name: userName,
    prompt,
    text,
    created_at: serverTimestamp(),
  });
  showSuccess("Journal saved! 📝💕");
  document.getElementById("journalText").value = "";
}

function loadJournals() {
  const q = query(
    collection(db, "gardens", gardenCode, "journals"),
    orderBy("created_at", "desc"),
    limit(5)
  );
  onSnapshot(q, (snap) => {
    const html = snap.docs
      .map((d) => {
        const j = d.data();
        return `
        <div style="background:rgba(255,255,255,.9);padding:20px;border-radius:20px;margin-bottom:15px;">
          <div style="color:#a569bd;font-size:.9rem;margin-bottom:10px;">
            ${j.user_name} – ${new Date(
          j.created_at?.toDate()
        ).toLocaleDateString()}
          </div>
          <div style="color:#8b5fbf;font-weight:600;margin-bottom:10px;">"${
            j.prompt
          }"</div>
          <div style="color:#6c5ce7;line-height:1.5;">${j.text}</div>
        </div>`;
      })
      .join("");
    document.getElementById("recentJournals").innerHTML =
      '<h3 style="color:#a569bd;margin-bottom:15px;">Recent Entries</h3>' +
      html;
  });
}

// -------------------------------------------------
// 7. Utilities
// -------------------------------------------------
function showSection(sectionId, btn) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".nav-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");
  btn.classList.add("active");
}

function showSuccess(msg) {
  const d = document.createElement("div");
  d.style.cssText = `
    position:fixed;top:20px;left:50%;transform:translateX(-50%);
    background:linear-gradient(135deg,#a8e6cf 0%,#88d8a3 100%);color:white;
    padding:15px 25px;border-radius:25px;font-weight:600;z-index:1000;
    box-shadow:0 8px 30px rgba(0,0,0,.2);animation:fadeInUp .5s;
  `;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

// -------------------------------------------------
// 8. Auto-join if already in localStorage
// -------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  const code = localStorage.getItem("gardenCode");
  const name = localStorage.getItem("userName");
  if (code && name) {
    userName = name;
    enterApp(code);
  }
});
console.log("All functions should be loaded now");
console.log("createGarden function exists:", typeof createGarden);
console.log("joinGarden function exists:", typeof joinGarden);
// Make functions available globally
window.createGarden = createGarden;
window.joinGarden = joinGarden;
window.showSection = showSection;
window.selectMood = selectMood;
window.saveMood = saveMood;
window.addMemory = addMemory;
window.saveJournalEntry = saveJournalEntry;
