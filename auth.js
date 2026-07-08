import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBySfPYg6bqinjrK6vJURO4EYGZsBLLrUU",
  authDomain: "cyshells-6540a.firebaseapp.com",
  projectId: "cyshells-6540a",
  storageBucket: "cyshells-6540a.firebasestorage.app",
  messagingSenderId: "933233470258",
  appId: "1:933233470258:web:ad33d509ab9599a09f052b",
  measurementId: "G-MBT02DLP1W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById('login-form');
const dashboardBody = document.getElementById('dashboard-body');
const errorMessage = document.getElementById('error-message');

const isLoginPage = loginForm !== null;
const isDashboardPage = dashboardBody !== null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (isLoginPage) {
            window.location.href = "dashboard.html";
        } else if (isDashboardPage) {
            document.getElementById('dashboard-body').classList.remove('hidden');
            document.getElementById('dashboard-username').textContent = user.email;
        }
    } else {
        if (isDashboardPage) {
            window.location.href = './';
        }
    }
});

if (isLoginPage) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        errorMessage.classList.add('hidden');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log(`Email retrieved: ${email}`);
        console.log(`Password retrieved: ${password}`);

        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                errorMessage.textContent = 'Correo electrónico o contraseña incorrectos';
                errorMessage.classList.remove('hidden');
            });
    });
}

if (isDashboardPage) {
    document.getElementById('logout-button').addEventListener('click', () => {
        signOut(auth).then(() => {});
    });
}