**Aerialist | The Choreography of Tasks**
Aerialist is a focused productivity application designed to help users navigate their daily tasks with the grace and precision of a stage performance. By combining a minimalist Glassmorphic UI with a robust Firebase backend, it offers a seamless, cloud-synced experience for deep work.

**Features**
The Stage Door (Auth): Secure user registration and login system that personalizes the dashboard experience.

The Spotlight: A dedicated space for "center stage" focus, allowing users to highlight a single priority act.

Cloud Choreography: Real-time data persistence using Firestore, ensuring your task list (Acts) and progress (Landings) follow you across devices.  

In-Flight Timer: An integrated Pomodoro-style timer with presets to manage work intervals effectively.

The Gallery: An automated archive of successful "landings" to track completed tasks and daily productivity.

**Technical Stack**
Frontend: HTML5, CSS3 (Advanced Flexbox & Backdrop-filters).

Logic: Modern JavaScript (ES6 Modules).

Backend as a Service:

Firebase Authentication: Secure email/password handling.

Cloud Firestore: NoSQL document database for real-time state synchronization.

**Getting Started**
Clone the Repository:

Bash
git clone https://github.com/s-niezabitowska/aerialist-productivity-tracker.git
Firebase Setup:

Create a project at the Firebase Console.

Enable Authentication (Email/Password) and Firestore Database.

Replace the firebaseConfig object in script.js with your own project credentials.

Launch:

Open index.html using a local server (e.g., VS Code Live Server) to support ES6 Modules.
