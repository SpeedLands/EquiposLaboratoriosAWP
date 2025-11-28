document.addEventListener('DOMContentLoaded', () => {
    // --- Configuración IndexedDB ---
    const DB_NAME = 'EquiposAWP_DB';
    const DB_VERSION = 3; // <--- VERSIÓN 3: Agregamos cola de sincronización
    const DRAFT_STORE_NAME = 'equipoDraft';
    const INVENTORY_STORE_NAME = 'equiposCache';
    const SYNC_QUEUE_NAME = 'syncQueue'; // <--- NUEVA TABLA
    let db;

    // --- Elementos del DOM ---
    const userInfoDiv = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const addEquipoBtn = document.getElementById('add-equipo-btn');
    const searchInput = document.getElementById('search-input');
    const inventoryBody = document.getElementById('inventory-body');
    const modalContainer = document.getElementById('modal-container');

    // ==========================================
    // 1. MANEJO DE BASE DE DATOS (IndexedDB)
    // ==========================================

    function initDB() {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
                db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(INVENTORY_STORE_NAME)) {
                db.createObjectStore(INVENTORY_STORE_NAME, { keyPath: 'id' });
            }
            // Nueva tienda para guardar acciones pendientes cuando no hay internet
            if (!db.objectStoreNames.contains(SYNC_QUEUE_NAME)) {
                db.createObjectStore(SYNC_QUEUE_NAME, { keyPath: 'timestamp' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("BD Iniciada. Verificando cola de sincronización...");
            // Intentar sincronizar al iniciar si hay internet
            if (navigator.onLine) {
                processSyncQueue();
            }
        };
    }

    // --- API Helper INTELIGENTE ---
    async function api(action, data = null, isGet = false) {
        const url = isGet ? `api.php?action=${action}&q=${encodeURIComponent(data)}` : `api.php?action=${action}`;
        const options = isGet ? {} : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };

        try {
            // Intento normal de conexión
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en la petición');
            }
            return response.json();

        } catch (error) {
            // SI FALLA LA RED y es una acción de modificación (POST), guardamos para luego
            if ((error.name === 'TypeError' || error.message.includes('Failed to fetch')) && !isGet) {
                console.warn('Offline detectado. Guardando en cola...');
                
                // 1. Guardar en la cola de sincronización
                await addToSyncQueue(action, data);
                
                // 2. Actualizar la vista localmente (Optimistic UI) para que el usuario vea el cambio
                await updateLocalCacheOptimistically(action, data);

                // 3. Devolver una respuesta "falsa" de éxito para que el formulario se cierre
                return { success: true, offline: true, message: 'Guardado localmente (pendiente de sync)' };
            }
            throw error; // Si es otro error (o es un GET), lo lanzamos
        }
    }

    // ==========================================
    // 2. LÓGICA DE SINCRONIZACIÓN (LA MAGIA)
    // ==========================================

    async function addToSyncQueue(action, data) {
        if (!db) return;
        const transaction = db.transaction([SYNC_QUEUE_NAME], 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_NAME);
        const item = {
            timestamp: Date.now(), // ID único basado en tiempo
            action: action,
            data: data
        };
        store.add(item);
    }

    async function processSyncQueue() {
        if (!db || !navigator.onLine) return;

        const transaction = db.transaction([SYNC_QUEUE_NAME], 'readonly');
        const store = transaction.objectStore(SYNC_QUEUE_NAME);
        const request = store.getAll();

        request.onsuccess = async () => {
            const items = request.result;
            if (items.length === 0) return;

            console.log(`Sincronizando ${items.length} elementos...`);
            
            // Mostrar notificación visual
            const notif = document.createElement('div');
            notif.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50';
            notif.textContent = 'Sincronizando cambios pendientes...';
            document.body.appendChild(notif);

            for (const item of items) {
                try {
                    // Enviamos al servidor REALMENTE
                    await fetch(`api.php?action=${item.action}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.data)
                    });
                    
                    // Si tuvo éxito, borramos de la cola
                    const deleteTx = db.transaction([SYNC_QUEUE_NAME], 'readwrite');
                    deleteTx.objectStore(SYNC_QUEUE_NAME).delete(item.timestamp);

                } catch (err) {
                    console.error("Error sincronizando item:", item, err);
                }
            }
            
            notif.textContent = '¡Sincronización completada!';
            setTimeout(() => notif.remove(), 3000);
            
            // Recargamos datos frescos del servidor
            loadEquipos();
        };
    }

    // Escuchar cuando vuelve el internet
    window.addEventListener('online', () => {
        console.log("Conexión recuperada. Procesando cola...");
        processSyncQueue();
        loadEquipos(); // Refrescar tabla
    });

    window.addEventListener('offline', () => {
        loadEquipos(); // Para mostrar aviso de offline
    });

    // ==========================================
    // 3. ACTUALIZACIÓN OPTIMISTA (UI OFFLINE)
    // ==========================================
    
    async function updateLocalCacheOptimistically(action, data) {
        const transaction = db.transaction([INVENTORY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(INVENTORY_STORE_NAME);

        return new Promise((resolve) => {
            if (action === 'add_equipo') {
                // Generamos un ID temporal para mostrarlo en la tabla
                data.id = 'temp_' + Date.now(); 
                data.fechaHoraIngreso = new Date().toISOString(); 
                store.add(data);
                resolve();
            } else if (action === 'update_equipo') {
                // Necesitamos obtener el objeto viejo para mantener la fecha original si no viene en data
                store.get(parseInt(data.id)).onsuccess = (e) => {
                    const oldData = e.target.result;
                    if(oldData) {
                        const updatedData = { ...oldData, ...data }; // Mezclar datos
                        store.put(updatedData);
                    }
                    resolve();
                };
            } else if (action === 'delete_equipo') {
                // Convertir ID a número porque viene como string del dataset
                store.delete(parseInt(data.id));
                // También intentamos borrar si es un ID temporal string
                store.delete(data.id); 
                resolve();
            }
        });
    }

    // Funciones Helper de Caché Inventario
    function cacheAllEquipos(equipos) {
        if (!db) return;
        const transaction = db.transaction([INVENTORY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(INVENTORY_STORE_NAME);
        store.clear(); 
        equipos.forEach(equipo => store.put(equipo));
    }

    function getCachedEquipos(query = '') {
        if (!db) return Promise.resolve([]);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([INVENTORY_STORE_NAME], 'readonly');
            const store = transaction.objectStore(INVENTORY_STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                let resultados = request.result;
                if (query) {
                    const q = query.toLowerCase();
                    resultados = resultados.filter(eq => 
                        eq.nombre.toLowerCase().includes(q) || 
                        eq.descripcion.toLowerCase().includes(q)
                    );
                }
                resolve(resultados);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // ==========================================
    // 4. FUNCIONES DE BORRADOR (DRAFTS)
    // ==========================================
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

    // ==========================================
    // 5. LÓGICA DE INTERFAZ (UI)
    // ==========================================

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
            // Modo offline: asumimos logueado y mostramos caché
            userInfoDiv.innerHTML = `<p class="font-semibold text-orange-600">Modo Offline</p>`;
            loadEquipos();
        }
    }

    async function loadEquipos(query = '') {
        inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Cargando...</td></tr>';
        
        // 1. Intentar cargar de RED
        try {
            const equipos = await api('get_equipos', query, true);
            renderEquiposTable(equipos);
            if(query === '') cacheAllEquipos(equipos); // Actualizar caché
        } catch (error) {
            // 2. Si falla, cargar de CACHÉ LOCAL
            console.warn("Usando datos locales...");
            try {
                const cachedEquipos = await getCachedEquipos(query);
                if (cachedEquipos.length >= 0) {
                    renderEquiposTable(cachedEquipos);
                    
                    // Aviso visual de estado offline
                    const queueCount = await countPendingSyncs();
                    const pendingMsg = queueCount > 0 ? ` (${queueCount} cambios pendientes)` : '';
                    
                    const aviso = document.createElement('tr');
                    aviso.innerHTML = `<td colspan="5" class="bg-orange-100 text-orange-800 text-center text-xs p-2 font-bold">
                        ⚠️ Estás Offline. Trabajando con copia local.${pendingMsg}
                    </td>`;
                    inventoryBody.prepend(aviso);
                }
            } catch (dbError) {
                console.error(dbError);
            }
        }
    }
    
    // Función auxiliar para contar pendientes
    function countPendingSyncs() {
        if(!db) return Promise.resolve(0);
        return new Promise(resolve => {
            const store = db.transaction([SYNC_QUEUE_NAME], 'readonly').objectStore(SYNC_QUEUE_NAME);
            store.count().onsuccess = (e) => resolve(e.target.result);
        });
    }

    function renderEquiposTable(equipos) {
        inventoryBody.innerHTML = '';
        if (equipos.length === 0) {
            inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No se encontraron equipos.</td></tr>';
            return;
        }
        equipos.forEach(equipo => {
            // Identificar si es un equipo temporal (creado offline)
            const isTemp = String(equipo.id).startsWith('temp_');
            const rowClass = isTemp ? 'bg-yellow-50 border-b border-yellow-200' : 'border-b border-slate-200';
            
            const row = document.createElement('tr');
            row.className = rowClass;
            row.innerHTML = `
                <td class="px-6 py-4">
                    ${equipo.nombre} 
                    ${isTemp ? '<span class="text-xs text-orange-500 font-bold">(Pendiente)</span>' : ''}
                </td>
                <td class="px-6 py-4 hidden sm:table-cell">${equipo.descripcion}</td>
                <td class="px-6 py-4 hidden md:table-cell">${new Date(equipo.fechaHoraIngreso).toLocaleString()}</td>
                <td class="px-6 py-4">${equipo.estado}</td>
                <td class="px-6 py-4 text-right">
                    <button class="edit-btn text-[#0A80AB] hover:underline" data-id="${equipo.id}">Editar</button>
                    <button class="delete-btn text-red-600 hover:underline ml-4" data-id="${equipo.id}">Eliminar</button>
                </td>
            `;
            inventoryBody.appendChild(row);
        });
    }
    
    // Modals y Forms
    async function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        const action = data.id && !data.id.startsWith('temp_') ? 'update_equipo' : 'add_equipo';
        
        // Corrección: Si editamos un temporal, en realidad es un 'add' en la cola, 
        // pero para simplificar, si es temporal lo tratamos como nuevo.
        if(data.id.startsWith('temp_')) {
             // Lógica avanzada: habría que actualizar el item en la cola queue.
             // Para este tutorial básico, permitiremos crearlo de nuevo o editarlo visualmente.
        }

        try {
            const response = await api(action, data);
            
            // Limpiar borrador
            if (!data.id || data.id.startsWith('temp_')) clearDraft(); 
            
            modalContainer.innerHTML = '';
            
            // Si fue guardado offline, mostramos alerta suave
            if(response.offline) {
                loadEquipos(); // Recarga desde caché local con el nuevo dato
            } else {
                loadEquipos(); // Recarga desde red
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    // Modal render functions (Sin cambios drásticos, solo re-uso)
    async function renderEquipoModal(equipo = null) {
        const isEdit = equipo !== null;
        const title = isEdit ? 'Editar Equipo' : 'Registrar Nuevo Equipo';
        const draft = isEdit ? null : await loadDraft();

        modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 class="text-2xl font-bold mb-6">${title}</h2>
                <form id="equipo-form" class="space-y-4">
                    <input type="hidden" name="id" value="${equipo?.id || ''}">
                    <div><label class="block text-sm">Nombre</label><input type="text" name="nombre" value="${draft?.nombre || equipo?.nombre || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm">Descripción</label><textarea name="descripcion" class="w-full mt-1 p-2 border rounded">${draft?.descripcion || equipo?.descripcion || ''}</textarea></div>
                    <div>
                        <label class="block text-sm">Estado</label>
                        <select name="estado" class="w-full mt-1 p-2 border rounded">
                            <option value="Disponible" ${ (draft?.estado || equipo?.estado) === 'Disponible' ? 'selected' : '' }>Disponible</option>
                            <option value="Ocupado" ${ (draft?.estado || equipo?.estado) === 'Ocupado' ? 'selected' : '' }>Ocupado</option>
                            <option value="En Mantenimiento" ${ (draft?.estado || equipo?.estado) === 'En Mantenimiento' ? 'selected' : '' }>En Mantenimiento</option>
                        </select>
                    </div>
                    <div class="text-right mt-4">
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

    // --- Event Listeners ---
    async function handleLogout() {
        try { await api('logout'); } catch(e){}
        window.location.href = 'index.html';
    }

    logoutBtn.addEventListener('click', handleLogout);
    addEquipoBtn.addEventListener('click', () => renderEquipoModal());
    
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadEquipos(e.target.value), 300);
    });

    inventoryBody.addEventListener('click', async (e) => {
        let equipos = await getCachedEquipos(); // Buscar en local primero
        
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            // OJO: Los IDs temporales son strings, los de BD son números (generalmente)
            const equipo = equipos.find(eq => eq.id == id); 
            if(equipo) renderEquipoModal(equipo);
        }
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            const equipo = equipos.find(eq => eq.id == id);
            if(equipo) renderDeleteModal(equipo);
        }
    });

    // --- Carga Inicial ---
    initDB();
    checkUserSession();

    // --- SW ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
});