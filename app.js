let rawData = [];
let currentUser = null;
let currentPass = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    setupEvents();
});

function setupEvents() {
    const loginBtn = document.getElementById('loginBtn');
    const searchInput = document.getElementById('searchInput');

    if (loginBtn) {
        loginBtn.addEventListener('click', iniciarSesion);
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = rawData.filter(row => {
                return Object.values(row).some(val => 
                    String(val || '').toLowerCase().includes(query)
                );
            });
            renderTabla(filtered);
        });
    }
}

function iniciarSesion() {
    const userSelect = document.getElementById('usuarioSelect');
    const passInput = document.getElementById('passwordInput');

    if (!userSelect || !passInput) return;

    currentUser = userSelect.value;
    currentPass = passInput.value;

    if (!currentPass) {
        alert("Por favor ingresa tu contraseña.");
        return;
    }

    // Aplica el filtro si había texto en la barra al iniciar sesión
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (query) {
        const filtered = rawData.filter(row => 
            Object.values(row).some(val => String(val || '').toLowerCase().includes(query))
        );
        renderTabla(filtered);
    } else {
        renderTabla(rawData);
    }

    alert(`Sesión iniciada correctamente como ${currentUser}. Celdas habilitadas.`);
}

async function cargarDatos() {
    try {
        const res = await fetch('/api/reservas');
        rawData = await res.json();
        renderTabla(rawData);
    } catch (err) {
        console.error("Error al cargar datos desde Neon:", err);
    }
}

function renderTabla(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const campos = [
        'id_reserva', 'tr4', 'pin_sn', 'modelo', 'cliente',
        'fecha_creacion', 'creado_por', 'tecnico', 'estado',
        'estado_unidad', 'actividades'
    ];

    data.forEach((row) => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;

        campos.forEach((key) => {
            const td = document.createElement('td');
            td.textContent = row[key] || '';
            
            if (currentUser) {
                let esEditable = false;

                if (currentUser === 'Edgar') {
                    esEditable = true;
                } else if (currentUser === 'Ernestina') {
                    if (key === 'tr4' || key === 'estado') {
                        esEditable = true;
                    }
                }

                if (esEditable) {
                    td.contentEditable = "true";
                    td.addEventListener('blur', () => guardarCelda(row.id, key, td.textContent.trim()));
                } else {
                    td.contentEditable = "false";
                }
            } else {
                td.contentEditable = "false";
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

async function guardarCelda(rowId, campo, valor) {
    if (!currentUser || !currentPass) {
        alert('Debes ingresar tu contraseña antes de editar.');
        return;
    }

    try {
        const res = await fetch('/api/guardar-celda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: currentUser,
                password: currentPass,
                id: rowId,
                campo: campo,
                valor: valor
            })
        });
        const result = await res.json();
        if (!res.ok) alert(result.message);
    } catch (err) {
        alert('Error al guardar los cambios en la nube.');
    }
}
