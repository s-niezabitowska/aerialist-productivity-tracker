/**
 * Aerialist Logic: Task Overhaul - Stage 3 (Modal Editing & Sidebar)
 * Organized by functional blocks for clarity and scalability.
 */

import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- 1. DOM ELEMENTS ---
const elements = {
    // Auth Components
    authOverlay: document.getElementById('auth-overlay'),
    mainDashboard: document.getElementById('main-dashboard'),
    authError: document.getElementById('auth-error'),
    userGreeting: document.getElementById('user-greeting'),
    signupFields: document.getElementById('signup-fields'),
    
    // Auth Inputs
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    firstNameInput: document.getElementById('first-name'),
    surnameInput: document.getElementById('surname'),
    
    // Quick Capture (Sidebar)
    actInput: document.getElementById('act-input'),
    dueDateInput: document.getElementById('due-date'),
    priorityInput: document.getElementById('priority-level'),
    addTaskBtn: document.getElementById('add-task-btn'),
    
    // Task Lists
    actList: document.getElementById('act-list'),
    spotlightArea: document.getElementById('spotlight-area'),
    placeholder: document.getElementById('spotlight-placeholder'),
    archiveList: document.getElementById('archive-list'),
    archiveSection: document.getElementById('archive-section'),
    landedCountDisplay: document.getElementById('landed-count'),
    
    // Edit Modal
    editModal: document.getElementById('edit-modal'),
    editActInput: document.getElementById('edit-act-input'),
    editDueDateInput: document.getElementById('edit-due-date'),
    editPriorityInput: document.getElementById('edit-priority-level'),
    saveEditBtn: document.getElementById('save-edit-btn'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    
    // Timer
    timerDisplay: document.getElementById('timer-display'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    timerContainer: document.querySelector('.timer-container'),
    customTimeBtn: document.getElementById('custom-time-btn')
};

// --- 2. APP STATE ---
let state = {
    currentUser: null,
    landedCount: 0,
    acts: [],
    editingId: null // Tracks which task is currently in the "Dressing Room" modal
};

let timerInterval;
let timeLeft = 25 * 60;
let isTimerRunning = false;

// --- 3. AUTHENTICATION & UI ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        state.currentUser = user;
        await loadUserData(user.uid);
        toggleUI(true);
    } else {
        state.currentUser = null;
        toggleUI(false);
    }
});

function toggleUI(isLoggedIn) {
    elements.authOverlay.classList.toggle('hidden', isLoggedIn);
    elements.mainDashboard.classList.toggle('hidden', !isLoggedIn);
    if (!isLoggedIn) resetAppState();
}

function resetAppState() {
    state.acts = [];
    state.landedCount = 0;
    renderActs();
}

// --- 4. CLOUD PERSISTENCE ---
async function saveState() {
    if (!state.currentUser) return;
    try {
        await setDoc(doc(db, "users", state.currentUser.uid), { 
            acts: state.acts, 
            landedCount: state.landedCount 
        }, { merge: true });
    } catch (e) { console.error("Cloud Save Error:", e); }
}

async function loadUserData(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.firstName) elements.userGreeting.innerText = `Welcome, ${data.firstName}`;
            state.acts = data.acts || [];
            state.landedCount = data.landedCount || 0;
            renderActs(); 
        }
    } catch (e) { console.error("Cloud Load Error:", e); }
}

// --- 5. TASK LOGIC (CAPTURE & EDIT) ---
// Utility to flip yyyy-mm-dd to dd-mm-yyyy
function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr === "Asap") return "Asap";
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
}

function handleNewTask() {
    const taskName = elements.actInput.value.trim();
    const dueDate = elements.dueDateInput.value;
    const priority = elements.priorityInput.value;

    if (taskName) {
        state.acts.push({
            text: taskName,
            dueDate: dueDate || "Asap", // Logic determines "Asap" if date is empty
            priority: priority,
            isFocused: false,
            isArchived: false,
            id: Date.now()
        });
        
        elements.actInput.value = "";
        elements.dueDateInput.value = "";
        elements.priorityInput.value = "medium";
        
        saveState();
        renderActs();
    }
}

function renderActs() {
    elements.actList.innerHTML = '';
    elements.spotlightArea.innerHTML = '';
    elements.archiveList.innerHTML = '';
    
    state.acts.forEach((act, index) => {
        const li = createActElement(act, index);
        if (act.isArchived) elements.archiveList.prepend(li);
        else if (act.isFocused) elements.spotlightArea.appendChild(li);
        else elements.actList.appendChild(li);
    });
    
    updatePlaceholder();
    elements.landedCountDisplay.innerText = state.landedCount;
    elements.archiveSection.classList.toggle('hidden', state.landedCount === 0);
}

function createActElement(act, index) {
    const li = document.createElement('li');
    li.className = `act-item priority-${act.priority}`;
    if (act.isFocused) li.classList.add('in-flight');
    if (act.isArchived) li.classList.add('archived-item');

    li.innerHTML = `
        <div class="act-content">
            <span class="act-title">${act.text}</span>
            <div class="act-meta">
                <span class="act-priority-badge">${act.priority}</span>
                <span class="act-date-badge">🗓️ ${formatDisplayDate(act.dueDate)}</span>
            </div>
        </div>
        <div class="act-actions">
            ${!act.isArchived ? `
                <button class="edit-btn" title="Edit">✎</button>
                <button class="complete-btn" title="Complete">✓</button>
                <button class="focus-btn" title="Focus">${act.isFocused ? '✦' : '✧'}</button>
                <button class="land-btn" title="Remove">—</button>
            ` : `
                <button class="undo-btn" title="Undo">⟲</button>
            `}
        </div>
    `;

    // Edit Logic (Opens Modal)
    li.querySelector('.edit-btn')?.addEventListener('click', () => {
        state.editingId = act.id;
        elements.editActInput.value = act.text;
        elements.editDueDateInput.value = act.dueDate === "Asap" ? "" : act.dueDate;
        elements.editPriorityInput.value = act.priority;
        elements.editModal.classList.remove('hidden');
    });

    li.querySelector('.undo-btn')?.addEventListener('click', () => {
        state.landedCount--;
        act.isArchived = false;
        saveState();
        renderActs();
    });
    
    li.querySelector('.focus-btn')?.addEventListener('click', () => {
        const wasFocused = act.isFocused;
        state.acts.forEach(a => a.isFocused = false);
        act.isFocused = !wasFocused;
        saveState(); renderActs();
    });

    li.querySelector('.land-btn')?.addEventListener('click', () => {
        li.classList.add('landing');
        setTimeout(() => { state.acts.splice(index, 1); saveState(); renderActs(); }, 600);
    });

    li.querySelector('.complete-btn')?.addEventListener('click', () => {
        li.classList.add('completed-animation');
        setTimeout(() => { 
            state.landedCount++; 
            act.isArchived = true; 
            act.isFocused = false; 
            saveState(); renderActs(); 
        }, 500);
    });

    return li;
}

function updatePlaceholder() {
    const hasSpotlightTask = elements.spotlightArea.querySelector('.act-item');
    elements.placeholder.classList.toggle('hidden', !!hasSpotlightTask);
    if (!hasSpotlightTask && !elements.spotlightArea.contains(elements.placeholder)) {
        elements.spotlightArea.appendChild(elements.placeholder);
    }
}

// --- 6. MODAL ACTIONS ---
elements.saveEditBtn.addEventListener('click', () => {
    const taskIndex = state.acts.findIndex(a => a.id === state.editingId);
    if (taskIndex !== -1) {
        state.acts[taskIndex].text = elements.editActInput.value.trim();
        state.acts[taskIndex].dueDate = elements.editDueDateInput.value || "Asap";
        state.acts[taskIndex].priority = elements.editPriorityInput.value;
        
        state.editingId = null;
        elements.editModal.classList.add('hidden');
        saveState();
        renderActs();
    }
});

elements.closeModalBtn.addEventListener('click', () => {
    elements.editModal.classList.add('hidden');
    state.editingId = null;
});

// --- 7. TIMER LOGIC ---
function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    elements.timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function toggleTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        elements.startBtn.textContent = "START TIMER";
        elements.timerContainer.classList.remove('active-flight');
    } else {
        elements.startBtn.textContent = "PAUSE";
        elements.timerContainer.classList.add('active-flight');
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                new Audio('https://assets.mixkit.co/sfx/preview/mixkit-simple-notification-alert-2630.mp3').play();
                isTimerRunning = false;
                elements.startBtn.textContent = "START TIMER";
            }
        }, 1000);
    }
    isTimerRunning = !isTimerRunning;
}

// --- 8. EVENT LISTENERS & AUTH ---

// Toggle Login/Signup
document.getElementById('signup-toggle').addEventListener('click', () => {
    const isLoggingIn = elements.signupFields.classList.contains('hidden');
    elements.signupFields.classList.toggle('hidden');
    document.getElementById('auth-title').innerText = isLoggingIn ? "New Performer" : "The Stage Door";
    document.getElementById('login-btn').classList.toggle('hidden');
    document.getElementById('signup-submit').classList.toggle('hidden');
    document.getElementById('signup-toggle').innerText = isLoggingIn ? "BACK TO LOGIN" : "NEW USER";
});

// Login
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = elements.emailInput.value;
    const password = elements.passwordInput.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        elements.authError.innerText = "Check your credentials and try again.";
        elements.authError.classList.remove('hidden');
    }
});

// Register
document.getElementById('signup-submit').addEventListener('click', async () => {
    const email = elements.emailInput.value;
    const password = elements.passwordInput.value;
    const firstName = elements.firstNameInput.value;
    const surname = elements.surnameInput.value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            firstName: firstName,
            surname: surname,
            acts: [],
            landedCount: 0
        });
    } catch (error) {
        elements.authError.innerText = error.message;
        elements.authError.classList.remove('hidden');
    }
});

elements.startBtn.addEventListener('click', toggleTimer);
elements.resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timeLeft = 25 * 60;
    updateTimerDisplay();
    elements.startBtn.textContent = "START TIMER";
    elements.timerContainer.classList.remove('active-flight');
});

elements.addTaskBtn.addEventListener('click', handleNewTask);
elements.actInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleNewTask(); });
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

document.querySelectorAll('.preset-btn[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isTimerRunning) return;
        timeLeft = parseInt(btn.getAttribute('data-time')) * 60;
        updateTimerDisplay();
    });
});