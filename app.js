const API_BASE = window.GEL_API_URL || "https://gel-backend.onrender.com";

const views = {
  home: document.getElementById("homeView"),
  journal: document.getElementById("journalView"),
  ideas: document.getElementById("ideasView"),
  wallet: document.getElementById("walletView"),
  youtube: document.getElementById("youtubeView"),
  devices: document.getElementById("devicesView"),
  settings: document.getElementById("settingsView")
};

const nav = document.querySelectorAll("[data-view]");
const title = document.getElementById("pageTitle");

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove("active"));
  views[name].classList.add("active");
  nav.forEach(n => n.classList.toggle("active", n.dataset.view === name));
  title.textContent = ({
    home:"Home", journal:"Daily Journal", ideas:"Idea Engine",
    wallet:"Account Wallet", youtube:"YouTube Learning",
    devices:"Authorized Devices", settings:"Settings"
  })[name];
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "devices") loadDevices();
  if (name === "settings") loadCurrentUser();
}

nav.forEach(n => n.addEventListener("click", () => showView(n.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = {};
  try { data = await response.json(); } catch {}

  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

async function requireSession() {
  try {
    const data = await api("/api/auth/me");
    window.gelUser = data.user;
    setUserUI(data.user);
    return true;
  } catch {
    location.href = "login.html";
    return false;
  }
}

function setUserUI(user) {
  document.querySelectorAll(".top-user b, .profile b").forEach(el => {
    el.textContent = user.displayName || user.email;
  });
  const greeting = document.querySelector(".hero h1");
  if (greeting) greeting.textContent = `Good evening, ${user.displayName || "there"}.`;
}

async function loadCurrentUser() {
  try {
    const data = await api("/api/auth/me");
    window.gelUser = data.user;
    setUserUI(data.user);
    const displayName = document.getElementById("displayName");
    if (displayName && document.activeElement !== displayName) {
      displayName.value = data.user.displayName || "";
    }
  } catch {}
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  location.href = "login.html";
});

const journalForm = document.getElementById("journalForm");
const JOURNAL_KEY = "gel_journal_local";

journalForm.addEventListener("submit", e => {
  e.preventDefault();
  const text = document.getElementById("journalText").value.trim();
  if (!text) return;

  // Journal cloud sync is intentionally not part of Phase 2 auth.
  // Keep the existing local journal until the journal API is implemented.
  const items = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
  items.unshift({ date: new Date().toLocaleString(), text });
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(items.slice(0, 100)));
  document.getElementById("journalText").value = "";
  renderJournal();
});

function renderJournal() {
  const box = document.getElementById("journalList");
  const items = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
  box.innerHTML = items.length
    ? items.map(x => `<div class="row"><div><b>${escapeHtml(x.text.slice(0,90))}${x.text.length>90?"…":""}</b><div class="muted">${escapeHtml(x.date)}</div></div></div>`).join("")
    : '<div class="muted">No entries yet. Tell GEL how your day went.</div>';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
renderJournal();

async function loadDevices() {
  const list = document.getElementById("deviceList");
  list.innerHTML = '<div class="muted">Loading authorized devices…</div>';

  try {
    const data = await api("/api/devices");
    document.getElementById("deviceCount").textContent = `${data.devices.length}/4 Authorized Devices`;

    list.innerHTML = data.devices.map(d => {
      const current = d.id === data.currentDeviceId;
      const label = current ? "Current device" : "Authorized";
      return `<div class="device">
        <div class="device-meta">
          <span class="dot"></span>
          <div>
            <b>${escapeHtml(d.device_name)}${current ? " · Current" : ""}</b>
            <div class="muted">${label} · Last seen ${new Date(d.last_seen_at).toLocaleString()}</div>
          </div>
        </div>
        <button class="btn danger" data-revoke-device="${d.id}">Remove</button>
      </div>`;
    }).join("") || '<div class="muted">No authorized devices.</div>';

    list.querySelectorAll("[data-revoke-device]").forEach(btn => {
      btn.addEventListener("click", () => revokeDevice(btn.dataset.revokeDevice));
    });
  } catch (err) {
    list.innerHTML = `<div class="muted">${escapeHtml(err.message)}</div>`;
  }
}

async function revokeDevice(deviceId) {
  if (!confirm("Remove this authorized device? Its active sessions will be revoked.")) return;

  try {
    const data = await api(`/api/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE" });
    if (data.currentDeviceRevoked) {
      location.href = "login.html";
      return;
    }
    await loadDevices();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById("saveSettings").addEventListener("click", async () => {
  // The Phase 1 backend does not yet expose a profile-update endpoint.
  // Keep the UI honest instead of pretending this is server-saved.
  alert("Profile saving will be connected when the profile API is added in the next backend phase.");
});

document.getElementById("ideaBtn").addEventListener("click", () => {
  const ideas = [
    "Build a web dashboard that controls a small ESP32 robot in real time.",
    "Create a local-business website generator where GEL turns a business profile into a polished site.",
    "Build a learning tracker that connects your daily journal to the skills you are trying to master."
  ];
  document.getElementById("ideaOutput").innerHTML =
    `<div class="idea"><b>${ideas[Math.floor(Math.random()*ideas.length)]}</b><p class="muted">GEL will later analyze your projects, journal and learning history to generate personalized ideas.</p></div>`;
});

document.getElementById("ytSearch").addEventListener("click", () => {
  const q = document.getElementById("ytQuery").value.trim() || "web development robotics AI";
  window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(q), "_blank", "noopener");
});

document.getElementById("clearJournal").addEventListener("click", () => {
  if (confirm("Clear local journal entries?")) {
    localStorage.removeItem(JOURNAL_KEY);
    renderJournal();
  }
});

document.getElementById("searchBox").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const q = e.target.value.trim();
    if (!q) return;
    document.getElementById("globalResult").textContent =
      `GEL search is ready for: “${q}” — full AI/web search will be connected in a later phase.`;
    showView("home");
  }
});

// Start the dashboard only after the real backend confirms the session.
requireSession();
