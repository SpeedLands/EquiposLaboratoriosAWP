// app.js

// Referencias al DOM
const searchInput = document.getElementById('search');
const tableBody = document.getElementById('inventory-body');
const offlineBanner = document.getElementById('offline-banner');
const statusIndicator = document.getElementById('status-indicator');
const loadingDiv = document.getElementById('loading');
const noDataDiv = document.getElementById('no-data');

// Clave para LocalStorage
const LS_KEY = 'inventario_lab_data';

// 1. Registro del Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.error('Fallo registro SW:', err));
    });
}

// 2. Lógica Principal: Obtener Datos
async function fetchData(query = '') {
    loadingDiv.classList.remove('hidden');
    tableBody.innerHTML = ''; // Limpiar tabla antes de cargar
    noDataDiv.classList.add('hidden');

    try {
        // INTENTO RED (Network First)
        const response = await fetch(`api.php?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) throw new Error('Error en la respuesta de la API');
        
        const data = await response.json();

        // ÉXITO ONLINE:
        updateOnlineStatus(true);
        renderTable(data);
        
        // GUARDAR EN LOCALSTORAGE (Persistencia para Offline)
        // Guardamos solo si es una búsqueda general (opcional, aquí guardamos todo lo que se ve)
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        console.log('Datos actualizados desde API y guardados en LocalStorage.');

    } catch (error) {
        // FALLO RED -> MODO OFFLINE
        console.warn('Fallo de red o API, intentando cargar desde caché local...', error);
        updateOnlineStatus(false);
        
        // LEER DE LOCALSTORAGE
        const localData = localStorage.getItem(LS_KEY);
        
        if (localData) {
            const parsedData = JSON.parse(localData);
            // Filtramos localmente si hay una búsqueda activa, ya que la API no respondió
            const filteredData = filterLocalData(parsedData, query);
            renderTable(filteredData);
        } else {
            noDataDiv.textContent = "Sin conexión y sin datos guardados.";
            noDataDiv.classList.remove('hidden');
        }
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

// Función auxiliar para filtrar datos locales cuando no hay internet
function filterLocalData(data, query) {
    if (!query) return data;
    const lowerQuery = query.toLowerCase();
    return data.filter(item => 
        item.nombre.toLowerCase().includes(lowerQuery) || 
        item.descripcion.toLowerCase().includes(lowerQuery)
    );
}

// 3. Renderizado de la Tabla
function renderTable(data) {
    tableBody.innerHTML = '';

    if (data.length === 0) {
        noDataDiv.classList.remove('hidden');
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b border-gray-200';
        
        // Estilo dinámico para el estado
        let estadoColor = 'text-gray-900';
        if(item.estado === 'Disponible') estadoColor = 'text-green-600 font-bold';
        if(item.estado === 'Ocupado') estadoColor = 'text-red-600 font-bold';

        row.innerHTML = `
            <td class="px-5 py-5 bg-white text-sm"><p class="text-gray-900 whitespace-no-wrap">${item.id}</p></td>
            <td class="px-5 py-5 bg-white text-sm"><p class="text-gray-900 whitespace-no-wrap font-medium">${item.nombre}</p></td>
            <td class="px-5 py-5 bg-white text-sm"><p class="text-gray-500 whitespace-no-wrap">${item.descripcion}</p></td>
            <td class="px-5 py-5 bg-white text-sm"><span class="${estadoColor}">${item.estado}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// 4. Manejo de UI (Online/Offline)
function updateOnlineStatus(isOnline) {
    if (isOnline) {
        statusIndicator.textContent = 'Online';
        statusIndicator.className = 'text-white text-sm bg-green-500 px-3 py-1 rounded-full font-semibold';
        offlineBanner.classList.add('hidden');
    } else {
        statusIndicator.textContent = 'Offline';
        statusIndicator.className = 'text-white text-sm bg-gray-500 px-3 py-1 rounded-full font-semibold';
        offlineBanner.classList.remove('hidden');
    }
}

// Event Listeners del Navegador para detectar cambios de red automáticamente
window.addEventListener('online', () => {
    updateOnlineStatus(true);
    fetchData(searchInput.value); // Recargar datos al volver internet
});
window.addEventListener('offline', () => updateOnlineStatus(false));

// Event Listener para búsqueda (con Debounce simple para no saturar)
let debounceTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchData(e.target.value);
    }, 300);
});

// Carga inicial
fetchData();