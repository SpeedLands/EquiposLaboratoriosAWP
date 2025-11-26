document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const ctaBtn = document.getElementById('cta-btn');
    const modalContainer = document.getElementById('modal-container');

    // --- API Helper ---
    async function api(action, data = null) {
        const options = data ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        } : {};
        const response = await fetch(`api.php?action=${action}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en la petición');
        }
        return response.json();
    }

    function renderModal(isRegister = false) {
        const title = isRegister ? 'Crear una Cuenta' : 'Iniciar Sesión';
        const buttonText = isRegister ? 'Registrar' : 'Acceder';
        const nameField = isRegister ? `
            <div>
                <label for="name" class="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input id="name" name="name" type="text" required class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A80AB]">
            </div>` : '';

        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
                <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                    <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">${title}</h2>
                    <form id="auth-form" class="space-y-4">
                        ${nameField}
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <input id="email" name="email" type="email" required autocomplete="email" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A80AB]">
                        </div>
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
                            <input id="password" name="password" type="password" required autocomplete="current-password" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A80AB]">
                        </div>
                        <div id="auth-error" class="text-red-600 text-sm text-center"></div>
                        <div>
                            <button type="submit" class="w-full py-3 text-white bg-[#0A80AB] rounded-md font-semibold hover:bg-opacity-90">${buttonText}</button>
                            <button type="button" id="close-modal-btn" class="w-full mt-2 py-2 text-gray-600">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>`;

        document.getElementById('auth-form').addEventListener('submit', (e) => handleAuth(e, isRegister));
        document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    }

    async function handleAuth(event, isRegister) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = '';

        try {
            const action = isRegister ? 'register' : 'login';
            const result = await api(action, data);

            if (isRegister) {
                alert('¡Registro exitoso! Por favor, inicia sesión.');
                renderModal(false); // Muestra el modal de login
            } else {
                window.location.href = 'dashboard.html'; // Redirige al dashboard
            }
        } catch (error) {
            errorDiv.textContent = error.message;
        }
    }

    function closeModal() {
        modalContainer.innerHTML = '';
    }

    loginBtn.addEventListener('click', () => renderModal(false));
    registerBtn.addEventListener('click', () => renderModal(true));
    ctaBtn.addEventListener('click', () => renderModal(true)); // El CTA abre el registro
});
