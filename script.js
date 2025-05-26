let timers = [];
let history = [];

const timerForm = document.getElementById('timerForm');
const timersContainer = document.getElementById('timersContainer');
const historyList = document.getElementById('historyList');
const alarmSound = document.getElementById('alarm');

const themeToggle = document.getElementById('themeToggle');
const exportBtn = document.getElementById('exportHistory');
const importInput = document.getElementById('importHistory');

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

// Load data on start
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.toggle('dark', localStorage.getItem('theme') === 'dark');
  timers = JSON.parse(localStorage.getItem('multiTimers')) || [];
  history = JSON.parse(localStorage.getItem('timerHistory')) || [];
  timers.forEach(t => startTimerLoop(t.id));
  renderTimers();
  renderHistory();
});

// Add new timer
timerForm.addEventListener('submit', e => {
  e.preventDefault();
  const label = document.getElementById('label').value.trim() || 'Unnamed';
  const h = parseInt(document.getElementById('hours').value) || 0;
  const m = parseInt(document.getElementById('minutes').value) || 0;
  const s = parseInt(document.getElementById('seconds').value) || 0;
  const total = h * 3600 + m * 60 + s;
  if (total <= 0) return alert("Enter a valid time");

  const id = Date.now().toString();
  const timer = {
    id,
    label,
    originalSeconds: total,
    remainingSeconds: total,
    endTime: Date.now() + total * 1000,
    paused: false,
  };

  timers.push(timer);
  saveTimers();
  startTimerLoop(id);
  renderTimers();
  timerForm.reset();
});

// Timer loop
function startTimerLoop(id) {
  const timer = timers.find(t => t.id === id);
  if (!timer || timer.interval) return;

  timer.interval = setInterval(() => {
    if (!timer.paused) {
      const now = Date.now();
      timer.remainingSeconds = Math.max(0, Math.floor((timer.endTime - now) / 1000));
      if (timer.remainingSeconds <= 0) {
        clearInterval(timer.interval);
        timer.interval = null;
        playAlarm();
        notify(`${timer.label} timer finished`);
        addToHistory(timer.label, timer.originalSeconds);
        timers = timers.filter(t => t.id !== id);
      }
      saveTimers();
      renderTimers();
    }
  }, 1000);
}

// Save and render
function saveTimers() {
  localStorage.setItem('multiTimers', JSON.stringify(timers));
}

function saveHistory() {
  localStorage.setItem('timerHistory', JSON.stringify(history));
}

function renderTimers() {
  timersContainer.innerHTML = '';
  timers.forEach(timer => {
    const div = document.createElement('div');
    div.className = 'timer';
    const time = formatTime(timer.remainingSeconds);
    div.innerHTML = `
      <strong>${timer.label}</strong><br/>
      <span>Remaining: ${time}</span>
      <div class="timer-controls">
        <button onclick="togglePause('${timer.id}')">${timer.paused ? 'Resume' : 'Pause'}</button>
        <button onclick="resetTimer('${timer.id}')">Reset</button>
      </div>
    `;
    timersContainer.appendChild(div);
  });
}

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `🕒 ${entry.label} - ${formatTime(entry.duration)} - ✅ ${entry.completedAt}`;
    historyList.appendChild(li);
  });
}

// Toggle pause/resume
window.togglePause = function (id) {
  const timer = timers.find(t => t.id === id);
  if (!timer) return;
  timer.paused = !timer.paused;
  if (!timer.paused) {
    timer.endTime = Date.now() + timer.remainingSeconds * 1000;
  }
  saveTimers();
  renderTimers();
};

// Reset/delete timer
window.resetTimer = function (id) {
  const i = timers.findIndex(t => t.id === id);
  if (i !== -1) {
    clearInterval(timers[i].interval);
    timers.splice(i, 1);
    saveTimers();
    renderTimers();
  }
};

// Add history item
function addToHistory(label, duration) {
  const completedAt = new Date().toLocaleString();
  history.unshift({ label, duration, completedAt });
  history = history.slice(0, 20);
  saveHistory();
  renderHistory();
}

// Format time
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function pad(n) {
  return n < 10 ? '0' + n : n;
}

function playAlarm() {
  alarmSound.play();
}

function notify(text) {
  if (Notification.permission === 'granted') {
    new Notification('Timer Complete!', { body: text });
  }
}

// Theme Toggle
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// Export/Import
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timer-history.json';
  a.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      history = data;
      saveHistory();
      renderHistory();
    }
  } catch (err) {
    alert('Invalid file');
  }
});
