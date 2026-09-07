let rawData = [];
let currentUser = null;
let currentPass = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    inicializarLogin();
});

function inicializarLogin() {
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const loginModal = document.getElementById('loginModal');
    const btnConfirmLogin = document.getElementById('btnConfirmLogin');
    const btnCancelLogin = document.getElementById('btnCancelLogin');
    const txtUser = document.getElementById('txtUser');
    const txtPass = document.getElementById('txtPass');
    const editorPanel = document.getElementById('editorPanel');
    const lblUsuario = document.getElementById('lblUsuario');

    function abrirModal() {
        loginModal.style.display = 'flex';
        txtUser.value = '';
        txtPass.value = '';
        txtUser.focus();
    }

    function cerrarModal() {
        loginModal.style.display = 'none';
    }

    function confirmarLogin() {
        const usuario = txtUser.value.trim();
        const pass = txtPass.value;

        if (!usuario || !pass) {
            alert('Ingrese usuario y contraseña.');
            return;
        }

        currentUser = usuario;
        currentPass = pass;

        cerrarModal();
        editorPanel.style.display = 'flex';
        lblUsuario.textContent = usuario;
        btnLogin.style.display = 'none';

        // Re-renderiza la tabla para habilitar las celdas editables según el usuario
        renderTabla(rawData);
    }

    function cerrarSesion() {
        currentUser = null;
        currentPass = null;
        editorPanel.style.display = 'none';
        btnLogin.style.display = 'inline-block';
        renderTabla(rawData);
    }

    btnLogin.addEventListener('click', abrirModal);
    btnCancelLogin.addEventListener('click', cerrarModal);
    btnConfirmLogin.addEventListener('click', confirmarLogin);
    btnLogout.addEventListener('click', cerrarSesion);

    // Permite confirmar con Enter desde el campo de contraseña
    txtPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmarLogin();
    });

    // Cierra el modal si se hace clic fuera del cuadro de login
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) cerrarModal();
    });
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
            
            // Reglas de edición según el usuario que inició sesión
            if (currentUser) {
                let esEditable = false;

                if (currentUser === 'Edgar') {
                    esEditable = true; // Edgar tiene acceso total
                } else if (currentUser === 'Ernestina') {
                    if (key === 'tr4' || key === 'estado') {
                        esEditable = true; // Ernestina solo edita TR4 y Estado
                    }
                }

                if (esEditable) {
                    td.contentEditable = "true";
                    td.style.background = "#ffffff";
                    td.style.border = "1px solid #002060";
                    td.addEventListener('blur', () => guardarCelda(row.id, key, td.textContent.trim()));
                } else {
                    td.contentEditable = "false";
                    td.style.background = "#f1f5f9"; // Deshabilitado / Fondo gris
                }
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

async function guardarCelda(rowId, campo, valor) {
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