document.addEventListener('DOMContentLoaded', () => {
    // --- DB Config for IndexedDB ---
    const DB_NAME = 'EquiposAWP_DB';
    const DRAFT_STORE_NAME = 'equipoDraft';
    let db;

    // --- DOM Elements ---
    const userInfoDiv = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const addEquipoBtn = document.getElementById('add-equipo-btn');
    const searchInput = document.getElementById('search-input');
    const inventoryBody = document.getElementById('inventory-body');
    const modalContainer = document.getElementById('modal-container');

    // --- API Helper ---
    async function api(action, data = null, isGet = false) {
        const url = isGet ? `api.php?action=${action}&q=${encodeURIComponent(data)}` : `api.php?action=${action}`;
        const options = isGet ? {} : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en la petición');
        }
        return response.json();
    }

    // --- IndexedDB Functions ---
    function initDB() {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
                db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
        };
        request.onerror = (event) => {
            console.error("Error al abrir IndexedDB:", event.target.errorCode);
        };
    }

    function saveDraft(data) {
        if (!db) return;
        const transaction = db.transaction([DRAFT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DRAFT_STORE_NAME);
        store.put({ id: 'current_draft', ...data });
    }

    function loadDraft() {
        if (!db) return Promise.resolve(null);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([DRAFT_STORE_NAME], 'readonly');
            const store = transaction.objectStore(DRAFT_STORE_NAME);
            const request = store.get('current_draft');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function clearDraft() {
        if (!db) return;
        const transaction = db.transaction([DRAFT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DRAFT_STORE_NAME);
        store.delete('current_draft');
    }

    // --- Session & UI ---
    async function checkUserSession() {
        try {
            const session = await api('check_session');
            if (session.loggedIn) {
                userInfoDiv.innerHTML = `<p class="font-semibold">${session.user.name}</p><p class="text-sm text-gray-500">${session.user.role}</p>`;
                loadEquipos();
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            window.location.href = 'index.html';
        }
    }

    async function handleLogout() {
        await api('logout');
        window.location.href = 'index.html';
    }

    // --- CRUD Logic ---
    async function loadEquipos(query = '') {
        inventoryBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Cargando...</td></tr>';
        try {
            const equipos = await api('get_equipos', query, true);
            renderEquiposTable(equipos);
        } catch (error) {
            inventoryBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500">${error.message}</td></tr>`;
        }
    }

    function renderEquiposTable(equipos) {
        inventoryBody.innerHTML = '';
        if (equipos.length === 0) {
            inventoryBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">No se encontraron equipos.</td></tr>';
            return;
        }
        equipos.forEach(equipo => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-200';
            row.innerHTML = `
                <td class="px-6 py-4">${equipo.nombre}</td>
                <td class="px-6 py-4">${equipo.categoria}</td>
                <td class="px-6 py-4">${equipo.serial}</td>
                <td class="px-6 py-4">${equipo.ubicacion}</td>
                <td class="px-6 py-4 text-right">${equipo.cantidad}</td>
                <td class="px-6 py-4 text-right">
                    <button class="edit-btn text-[#0A80AB] hover:underline" data-id="${equipo.id}">Editar</button>
                    <button class="delete-btn text-red-600 hover:underline ml-4" data-id="${equipo.id}">Eliminar</button>
                </td>
            `;
            inventoryBody.appendChild(row);
        });
    }

    // --- Modals ---
    async function renderEquipoModal(equipo = null) {
        const isEdit = equipo !== null;
        const title = isEdit ? 'Editar Equipo' : 'Registrar Nuevo Equipo';
        const draft = isEdit ? null : await loadDraft();

        modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
                <h2 class="text-2xl font-bold mb-6">${title}</h2>
                <form id="equipo-form" class="grid grid-cols-2 gap-6">
                    <input type="hidden" name="id" value="${equipo?.id || ''}">
                    <div><label class="block text-sm">Nombre</label><input type="text" name="nombre" value="${draft?.nombre || equipo?.nombre || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm">Categoría</label><input type="text" name="categoria" value="${draft?.categoria || equipo?.categoria || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm">Serial</label><input type="text" name="serial" value="${draft?.serial || equipo?.serial || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm">Fecha Adquisición</label><input type="date" name="fecha_adquisicion" value="${draft?.fecha_adquisicion || equipo?.fecha_adquisicion || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm">Ubicación</label><input type="text" name="ubicacion" value="${draft?.ubicacion || equipo?.ubicacion || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm">Cantidad</label><input type="number" name="cantidad" value="${draft?.cantidad || equipo?.cantidad || 1}" required class="w-full mt-1 p-2 border rounded"></div>
                    <div class="col-span-2"><label class="block text-sm">URL Imagen</label><input type="text" name="imagen" value="${draft?.imagen || equipo?.imagen || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div class="col-span-2 text-right mt-4">
                        <button type="button" id="close-modal-btn" class="px-4 py-2 text-gray-700">Cancelar</button>
                        <button type="submit" class="px-4 py-2 text-white bg-[#0A80AB] rounded-md ml-2">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                    </div>
                </form>
            </div>
        </div>`;

        const form = document.getElementById('equipo-form');
        if (!isEdit) {
            form.addEventListener('input', () => {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                saveDraft(data);
            });
        }
        form.addEventListener('submit', handleFormSubmit);
        document.getElementById('close-modal-btn').addEventListener('click', () => modalContainer.innerHTML = '');
    }

    function renderDeleteModal(equipo) {
         modalContainer.innerHTML = `
         <div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md text-center">
                <h2 class="text-xl font-bold mb-4">Confirmar Eliminación</h2>
                <p>¿Estás seguro de que deseas eliminar el equipo "${equipo.nombre}"?</p>
                <div class="mt-6">
                    <button id="cancel-delete-btn" class="px-4 py-2 text-gray-700">Cancelar</button>
                    <button id="confirm-delete-btn" class="px-4 py-2 text-white bg-red-600 rounded-md ml-2">Eliminar</button>
                </div>
            </div>
        </div>`;

        document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
            await api('delete_equipo', { id: equipo.id });
            modalContainer.innerHTML = '';
            loadEquipos();
        });
        document.getElementById('cancel-delete-btn').addEventListener('click', () => modalContainer.innerHTML = '');
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        const action = data.id ? 'update_equipo' : 'add_equipo';

        try {
            await api(action, data);
            if (!data.id) clearDraft(); // Limpiar borrador solo al crear
            modalContainer.innerHTML = '';
            loadEquipos();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    // --- Event Listeners ---
    logoutBtn.addEventListener('click', handleLogout);
    addEquipoBtn.addEventListener('click', () => renderEquipoModal());

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadEquipos(e.target.value), 300);
    });

    inventoryBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const equipos = await api('get_equipos', '', true);
            const equipo = equipos.find(eq => eq.id == id);
            renderEquipoModal(equipo);
        }
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            const equipos = await api('get_equipos', '', true);
            const equipo = equipos.find(eq => eq.id == id);
            renderDeleteModal(equipo);
        }
    });

    // --- Initial Load ---
    initDB();
    checkUserSession();
});
