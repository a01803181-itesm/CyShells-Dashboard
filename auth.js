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
const feedbackMessage = document.getElementById('feedback-message');

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
        feedbackMessage.classList.add('hidden');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log(`Email retrieved: ${email}`);
        console.log(`Password retrieved: ${password}`);

        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                feedbackMessage.textContent = 'Correo electrónico o contraseña incorrectos';
                feedbackMessage.classList.remove('hidden');
            });
    });

    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        feedbackMessage.classList.add('hidden');

        const email = document.getElementById('email').value;
        
        if (!email) {
            feedbackMessage.textContent = "Por favor, escribe primero tu dirección de correo electrónico en el campo de arriba y, a continuación, haz clic en «Recuperar Contraseña».";
            feedbackMessage.classList.remove('hidden');
            return;
        }
        
        sendPasswordResetEmail(auth, email)
            .then(() => {
                feedbackMessage.textContent = "¡Ya te hemos enviado el correo electrónico para restablecer la contraseña! Comprueba tu bandeja de entrada (y también spam)";
                feedbackMessage.classList.remove('hidden');
            })
            .catch((error) => {
                feedbackMessage.textContent = "Se ha producido un error al enviar el correo electrónico de restablecimiento. Asegúrate de que la dirección de correo electrónico es correcta";
                feedbackMessage.classList.remove('hidden');
            });
    });
}

if (isDashboardPage) {
    document.getElementById('nav-logout').addEventListener('click', () => {
        signOut(auth).then(() => {});
    });
}