/* =========================================================
   GEL CHAT + VOICE — initialized first and independently
   This block intentionally runs before dashboard initialization
   so another dashboard error cannot disable chat or microphone.
   ========================================================= */
(function initGELChatVoice() {
  "use strict";

  const boot = function () {
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessages = document.getElementById("chat-messages");
    const micBtn = document.getElementById("mic-btn");
    const voiceStatus = document.getElementById("voice-status");

    console.log("[GEL] Chat bootstrap started", {
      chatForm: !!chatForm,
      chatInput: !!chatInput,
      chatMessages: !!chatMessages,
      micBtn: !!micBtn
    });

    if (!chatForm || !chatInput || !chatMessages || !micBtn) {
      console.error("[GEL] Chat initialization failed: required elements are missing.");
      return;
    }

    function appendMessage(text, role) {
      const wrapper = document.createElement("div");
      wrapper.className = "chat-message " + (role === "user" ? "user" : "assistant");

      const label = document.createElement("div");
      label.className = "chat-label";
      label.textContent = role === "user" ? "YOU" : "GEL";

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.textContent = text;

      wrapper.appendChild(label);
      wrapper.appendChild(bubble);
      chatMessages.appendChild(wrapper);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return wrapper;
    }

    function setVoiceStatus(message) {
      if (voiceStatus) voiceStatus.textContent = message || "";
    }

    function speakGEL(text) {
      if (!("speechSynthesis" in window) || !text) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-NG";
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("[GEL] Voice output unavailable:", err);
      }
    }

    async function sendToGEL(message) {
      const clean = String(message || "").trim();
      if (!clean) return;

      appendMessage(clean, "user");
      chatInput.value = "";

      const thinking = appendMessage("GEL is thinking…", "assistant");
      thinking.classList.add("thinking");

      const API_BASE = window.GEL_API_URL || "https://gel-backend.onrender.com";

      try {
        console.log("[GEL] Sending chat request…");
        const response = await fetch(API_BASE + "/api/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: clean })
        });

        let data = {};
        try { data = await response.json(); } catch (_) {}

        if (!response.ok) {
          throw new Error(
            data.error || data.message || ("Request failed (" + response.status + ")")
          );
        }

        const reply = typeof data.reply === "string"
          ? data.reply
          : "I received the request, but GEL returned an unexpected response.";

        thinking.remove();
        appendMessage(reply, "assistant");
        speakGEL(reply);
        console.log("[GEL] Chat response received ✓");
      } catch (error) {
        console.error("[GEL] Chat request failed:", error);
        thinking.remove();
        appendMessage(
          "I couldn't reach GEL right now. " +
          (error.message || "Please try again."),
          "assistant"
        );
      }
    }

    chatForm.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();
      console.log("[GEL] Chat form submitted ✓");
      sendToGEL(chatInput.value);
    });

    chatInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
      }
    });

    console.log("[GEL] Chat listener attached ✓");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      micBtn.disabled = true;
      micBtn.title = "Speech recognition is not supported in this browser";
      setVoiceStatus("Voice input isn't supported here. Try Chrome or Edge.");
      console.warn("[GEL] Speech recognition API unavailable.");
      return;
    }

    let recognition;
    try {
      recognition = new SpeechRecognition();
    } catch (error) {
      console.error("[GEL] Could not create speech recognition:", error);
      setVoiceStatus("Couldn't initialize the microphone.");
      return;
    }

    recognition.lang = "en-NG";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let listening = false;

    recognition.onstart = function () {
      listening = true;
      micBtn.classList.add("listening");
      micBtn.textContent = "⏹️";
      micBtn.title = "Stop listening";
      setVoiceStatus("Listening… speak now.");
      console.log("[GEL] Microphone started ✓");
    };

    recognition.onresult = function (event) {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) chatInput.value = transcript.trim();
    };

    recognition.onerror = function (event) {
      console.error("[GEL] Speech recognition error:", event.error, event);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setVoiceStatus("Microphone permission was blocked. Allow microphone access and try again.");
      } else if (event.error === "no-speech") {
        setVoiceStatus("I didn't hear anything. Try again.");
      } else {
        setVoiceStatus("Voice input error: " + event.error);
      }
    };

    recognition.onend = function () {
      listening = false;
      micBtn.classList.remove("listening");
      micBtn.textContent = "🎙️";
      micBtn.title = "Use microphone";

      const text = chatInput.value.trim();
      setVoiceStatus(text ? "Voice captured. Press Send." : "");
      console.log("[GEL] Microphone ended.");
    };

    recognition.onspeechend = function () {
      try { recognition.stop(); } catch (_) {}
    };

    micBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      console.log("[GEL] Microphone button clicked ✓");

      if (listening) {
        recognition.stop();
        return;
      }

      try {
        chatInput.focus();
        setVoiceStatus("Starting microphone…");
        recognition.start();
      } catch (error) {
        console.error("[GEL] Could not start microphone:", error);
        setVoiceStatus(
          error.name === "InvalidStateError"
            ? "Microphone is already starting. Try again."
            : "Couldn't start the microphone. Check browser permission."
        );
      }
    });

    console.log("[GEL] Microphone listener attached ✓");
    window.GEL_CHAT_READY = true;
  };

  // The script is normally at the end of <body>, but this also works if moved.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();


/* =========================================================
   GEL DASHBOARD
   ========================================================= */
(function initGELDashboard() {
  "use strict";

  function bootDashboard() {
    try {
      const views = {
        home: document.getElementById('homeView'),
        journal: document.getElementById('journalView'),
        ideas: document.getElementById('ideasView'),
        wallet: document.getElementById('walletView'),
        youtube: document.getElementById('youtubeView'),
        devices: document.getElementById('devicesView'),
        settings: document.getElementById('settingsView')
      };
      const nav = document.querySelectorAll('[data-view]');
      const title = document.getElementById('pageTitle');

      function showView(name){
        if (!views[name]) return;
        Object.values(views).forEach(v => { if (v) v.classList.remove('active'); });
        views[name].classList.add('active');
        nav.forEach(n => n.classList.toggle('active', n.dataset.view === name));
        if (title) {
          title.textContent = ({
            home:'Home',
            journal:'Daily Journal',
            ideas:'Idea Engine',
            wallet:'Account Wallet',
            youtube:'YouTube Learning',
            devices:'Authorized Devices',
            settings:'Settings'
          })[name] || name;
        }
        window.scrollTo({top:0,behavior:'smooth'});
      }

      nav.forEach(n => n.addEventListener('click', () => showView(n.dataset.view)));
      document.querySelectorAll('[data-go]').forEach(
        b => b.addEventListener('click', () => showView(b.dataset.go))
      );

      if (localStorage.getItem('gel_logged_in') !== '1') {
        location.href = 'login.html';
        return;
      }

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('gel_logged_in');
          location.href = 'login.html';
        });
      }

      const journalForm = document.getElementById('journalForm');
      if (journalForm) {
        journalForm.addEventListener('submit', e => {
          e.preventDefault();
          const field = document.getElementById('journalText');
          const text = field ? field.value.trim() : '';
          if (!text) return;
          const items = JSON.parse(localStorage.getItem('gel_journal') || '[]');
          items.unshift({date:new Date().toLocaleString(),text});
          localStorage.setItem('gel_journal', JSON.stringify(items.slice(0,100)));
          if (field) field.value = '';
          renderJournal();
        });
      }

      function renderJournal(){
        const box = document.getElementById('journalList');
        if (!box) return;
        const items = JSON.parse(localStorage.getItem('gel_journal') || '[]');
        box.innerHTML = items.length
          ? items.map(x =>
              `<div class="row"><div><b>${escapeHtml(x.text.slice(0,90))}${x.text.length>90?'…':''}</b><div class="muted">${escapeHtml(x.date)}</div></div></div>`
            ).join('')
          : '<div class="muted">No entries yet. Tell GEL how your day went.</div>';
      }

      function escapeHtml(s){
        return String(s).replace(/[&<>"']/g,m => ({
          '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
        }[m]));
      }
      renderJournal();

      const devices = [
        {name:'Main Device',detail:'This device',active:true},
        {name:'Backup Device',detail:'Not logged in',active:false},
        {name:'Recovery Device 1',detail:'Not logged in',active:false},
        {name:'Recovery Device 2',detail:'Not logged in',active:false}
      ];

      function renderDevices(){
        const box = document.getElementById('deviceList');
        if (!box) return;
        box.innerHTML = devices.map((d,i) =>
          `<div class="device"><div class="device-meta"><span class="dot" style="background:${d.active?'var(--green)':'#526a80'}"></span><div><b>${d.name}</b><div class="muted">${d.detail}</div></div></div><button class="btn ${i===0?'danger':''}" onclick="toggleDevice(${i})">${d.active?'Remove':'Authorize'}</button></div>`
        ).join('');
      }

      window.toggleDevice = i => {
        if (i === 0) {
          alert('The main device cannot be removed from this demo.');
          return;
        }
        devices[i].active = !devices[i].active;
        devices[i].detail = devices[i].active ? 'Authorized' : 'Not logged in';
        renderDevices();
        const count = document.getElementById('deviceCount');
        if (count) count.textContent =
          devices.filter(d => d.active).length + '/4 Authorized Devices';
      };
      renderDevices();

      const saveSettings = document.getElementById('saveSettings');
      if (saveSettings) {
        saveSettings.addEventListener('click', () => {
          const field = document.getElementById('displayName');
          localStorage.setItem('gel_name', field ? field.value : '');
          alert('Settings saved.');
        });
      }

      const displayName = document.getElementById('displayName');
      if (displayName) displayName.value = localStorage.getItem('gel_name') || 'Seyi';

      const ideaBtn = document.getElementById('ideaBtn');
      if (ideaBtn) {
        ideaBtn.addEventListener('click', () => {
          const ideas = [
            'Build a web dashboard that controls a small ESP32 robot in real time.',
            'Create a local-business website generator where GEL turns a business profile into a polished site.',
            'Build a learning tracker that connects your daily journal to the skills you are trying to master.'
          ];
          const output = document.getElementById('ideaOutput');
          if (output) {
            output.innerHTML =
              `<div class="idea"><b>${ideas[Math.floor(Math.random()*ideas.length)]}</b><p class="muted">GEL would later analyze your projects, journal and learning history to generate more personalized ideas.</p></div>`;
          }
        });
      }

      const ytSearch = document.getElementById('ytSearch');
      if (ytSearch) {
        ytSearch.addEventListener('click', () => {
          const q = document.getElementById('ytQuery')?.value.trim() ||
            'web development robotics AI';
          window.open(
            'https://www.youtube.com/results?search_query=' +
            encodeURIComponent(q),
            '_blank',
            'noopener'
          );
        });
      }

      const clearJournal = document.getElementById('clearJournal');
      if (clearJournal) {
        clearJournal.addEventListener('click', () => {
          if (confirm('Clear local journal entries?')) {
            localStorage.removeItem('gel_journal');
            renderJournal();
          }
        });
      }

      const searchBox = document.getElementById('searchBox');
      if (searchBox) {
        searchBox.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            const q = e.target.value.trim();
            if (!q) return;
            const result = document.getElementById('globalResult');
            if (result) {
              result.textContent =
                `GEL search is ready for: “${q}” — full AI/web search will be connected in Phase 2.`;
            }
            showView('home');
          }
        });
      }

      console.log("[GEL] Dashboard initialized ✓");
    } catch (error) {
      // Never allow a dashboard error to break chat/voice.
      console.error("[GEL] Dashboard initialization error:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootDashboard, { once: true });
  } else {
    bootDashboard();
  }
})();
