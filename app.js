let rawData = [];
let currentUser = null;
let currentPass = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
});

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