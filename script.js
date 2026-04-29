/**
 * Aerialist Logic: Updated for Accessibility & Custom Timer
 */

import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

import { 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// DOM ELEMENTS
const authOverlay = document.getElementById('auth-overlay');
const mainDashboard = document.getElementById('main-dashboard');
const authError = document.getElementById('auth-error');
const userGreeting = document.getElementById('user-greeting');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const firstNameInput = document.getElementById('first-name');
const surnameInput = document.getElementById('surname');
const signupFields = document.getElementById('signup-fields');
const loginBtn = document.getElementById('login-btn');
const signupToggle = document.getElementById('signup-toggle');
const signupSubmit = document.getElementById('signup-submit');
const backToLogin = document.getElementById('back-to-login');
const logoutBtn = document.getElementById('logout-btn');
const actInput = document.getElementById('act-input');
const actList = document.getElementById('act-list');
const spotlightArea = document.getElementById('spotlight-area');
const placeholder = document.getElementById('spotlight-placeholder');
const archiveList = document.getElementById('archive-list');
const archiveSection = document.getElementById('archive-section');
const landedCountDisplay = document.getElementById('landed-count');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const timerContainer = document.querySelector('.timer-container');
const customTimeBtn = document.getElementById('custom-time-btn'); // New Reference

// APP STATE
let currentUser = null;
let landedCount = 0;
let acts = [];

// AUTHENTICATION & UI FLOW[cite: 10]
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData(user.uid); 
        toggleUI(true);
    } else {
        currentUser = null;
        toggleUI(false);
    }
});

function toggleUI(isLoggedIn) {
    if (isLoggedIn) {
        authOverlay.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
    } else {
        authOverlay.classList.remove('hidden');
        mainDashboard.classList.add('hidden');
        if (userGreeting) userGreeting.innerText = ""; 
        resetAppState();
    }
}

function resetAppState() {
    acts = [];
    landedCount = 0;
    renderActs();
}

// Signup/Login View Toggles[cite: 10]
signupToggle.addEventListener('click', () => {
    signupFields.classList.remove('hidden');
    signupSubmit.classList.remove('hidden');
    backToLogin.classList.remove('hidden');
    signupToggle.classList.add('hidden');
    loginBtn.classList.add('hidden');
    document.getElementById('auth-title').innerText = "Join the Troupe";
});

backToLogin.addEventListener('click', () => {
    signupFields.classList.add('hidden');
    signupSubmit.classList.add('hidden');
    backToLogin.classList.add('hidden');
    signupToggle.classList.remove('hidden');
    loginBtn.classList.remove('hidden');
    document.getElementById('auth-title').innerText = "The Stage Door";
});

// Firebase Auth Actions[cite: 10]
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        authError.innerText = "The stage door is locked. Check your credentials.";
        authError.classList.remove('hidden');
    }
});

signupSubmit.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fName = firstNameInput.value.trim();
    const sName = surnameInput.value.trim();

    if (!fName || !sName || password.length < 6) {
        authError.innerText = "Please provide your name and a 6-character passphrase.";
        authError.classList.remove('hidden');
        return;
    }

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCred.user.uid), {
            firstName: fName,
            surname: sName,
            acts: [],
            landedCount: 0
        });
    } catch (error) {
        authError.innerText = error.message;
        authError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// CLOUD PERSISTENCE[cite: 10]
async function saveState() {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid), { 
            acts: acts, 
            landedCount: landedCount 
        }, { merge: true });
    } catch (e) {
        console.error("Cloud Save Error: ", e);
    }
}

async function loadUserData(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.firstName && userGreeting) {
                userGreeting.innerText = `Welcome, ${data.firstName}`;
            }
            acts = data.acts || [];
            landedCount = data.landedCount || 0;
            renderActs(); 
        }
    } catch (e) {
        console.error("Cloud Load Error: ", e);
    }
}

// CORE TASK LOGIC[cite: 10]
function renderActs() {
    actList.innerHTML = '';
    spotlightArea.innerHTML = '';
    archiveList.innerHTML = '';
    spotlightArea.appendChild(placeholder);
    acts.forEach((act, index) => createActElement(act, index));
    landedCountDisplay.innerText = landedCount;
    if (landedCount > 0) archiveSection.classList.remove('hidden');
    updatePlaceholder();
}

actInput.addEventListener('keypress', (e) => {
    const val = actInput.value.trim();
    if (e.key === 'Enter' && val !== "") {
        acts.push({
            text: val,
            statusText: "ACTIVE",
            isFocused: false,
            isArchived: false
        });
        actInput.value = "";
        saveState();
        renderActs();
    }
});

// ACCESSIBILITY UPDATE: Dynamic buttons now include ARIA labels[cite: 9, 10]
function createActElement(act, index) {
    const li = document.createElement('li');
    li.className = 'act-item';
    if (act.isFocused) li.classList.add('in-flight');
    if (act.isArchived) li.classList.add('archived-item');

    li.innerHTML = `
        <div class="act-content">
            <span class="act-title">${act.text}</span>
            <span class="act-status">${act.statusText}</span>
        </div>
        ${!act.isArchived ? `
        <div class="act-actions">
            <button class="complete-btn" title="Complete" aria-label="Mark task as complete">✓</button>
            <button class="focus-btn" title="Focus" aria-label="${act.isFocused ? 'Remove focus' : 'Focus task'}">${act.isFocused ? '✦' : '✧'}</button>
            <button class="land-btn" title="Remove" aria-label="Delete task">—</button>
        </div>` : ''}
    `;

    li.querySelector('.focus-btn')?.addEventListener('click', () => {
        const wasFocused = act.isFocused;
        acts.forEach(a => a.isFocused = false);
        act.isFocused = !wasFocused;
        saveState();
        renderActs();
    });

    li.querySelector('.land-btn')?.addEventListener('click', () => {
        li.classList.add('landing');
        setTimeout(() => {
            acts.splice(index, 1);
            saveState();
            renderActs();
        }, 600);
    });

    li.querySelector('.complete-btn')?.addEventListener('click', () => {
        li.classList.add('completed-animation');
        setTimeout(() => {
            landedCount++;
            act.isArchived = true;
            act.isFocused = false;
            saveState();
            renderActs();
        }, 500);
    });

    if (act.isArchived) archiveList.prepend(li);
    else if (act.isFocused) spotlightArea.appendChild(li);
    else actList.appendChild(li);
}

function updatePlaceholder() {
    const hasTask = spotlightArea.querySelector('.act-item');
    placeholder.classList.toggle('hidden', !!hasTask);
}

// TIMER LOGIC
let timer;
let timeLeft = 25 * 60;
let isRunning = false;

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Preset button handlers
document.querySelectorAll('.preset-btn[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isRunning) return; // Prevent changing time during active flight
        timeLeft = parseInt(btn.getAttribute('data-time')) * 60;
        updateTimerDisplay();
    });
});

// Custom time handler[cite: 9]
customTimeBtn.addEventListener('click', () => {
    if (isRunning) return;
    const minutes = prompt("Enter custom duration (minutes):", "25");
    if (minutes && !isNaN(minutes) && minutes > 0) {
        timeLeft = Math.floor(parseFloat(minutes)) * 60;
        updateTimerDisplay();
    }
});

startBtn.addEventListener('click', () => {
    if (isRunning) {
        clearInterval(timer);
        startBtn.textContent = "START TIMER";
        timerContainer.classList.remove('active-flight');
        isRunning = false;
    } else {
        isRunning = true;
        startBtn.textContent = "PAUSE";
        timerContainer.classList.add('active-flight');
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timer);
                new Audio('https://assets.mixkit.co/sfx/preview/mixkit-simple-notification-alert-2630.mp3').play();
                startBtn.textContent = "START TIMER";
                timerContainer.classList.remove('active-flight');
                timeLeft = 25 * 60;
                updateTimerDisplay();
                isRunning = false;
            }
        }, 1000);
    }
});

resetBtn.addEventListener('click', () => {
    // 1. Stop the clock
    clearInterval(timer);
    isRunning = false;
    
    // 2. Reset the state
    startBtn.textContent = "START TIMER";
    timerContainer.classList.remove('active-flight');
    
    // 3. Revert to 25 minutes (or your current default)
    timeLeft = 25 * 60;
    updateTimerDisplay();
});