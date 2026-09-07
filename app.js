let rawData = [];
let filteredData = [];
let activeFilters = {};
let currentUser = null;
let currentPass = null;

const COL_MAP = [
    { key: 'id_reserva', label: 'ID RESERVA' },
    { key: 'tr4', label: 'TR4' },
    { key: 'pin_sn', label: 'PIN / SN' },
    { key: 'modelo', label: 'MODELO' },
    { key: 'cliente', label: 'CLIENTE' },
    { key: 'fecha_creacion', label: 'FECHA CREACIÓN' },
    { key: 'creado_por', label: 'CREADO POR' },
    { key: 'tecnico', label: 'TÉCNICO' },
    { key: 'estado', label: 'ESTADO' },
    { key: 'estado_unidad', label: 'ESTADO UNIDAD' },
    { key: 'actividades', label: 'ACTIVIDADES' }
];

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    inicializarLogin();
});

async function cargarDatos() {
    try {
        const res = await fetch('/api/reservas');
        rawData = await res.json();
        filteredData = [...rawData];
        construirEncabezadosConFiltros();
        renderTabla(filteredData);
    } catch (err) {
        console.error("Error al cargar datos desde Neon:", err);
    }
}

function construirEncabezadosConFiltros() {
    const theadRow = document.querySelector('#dataTable thead tr');
    theadRow.innerHTML = '';

    COL_MAP.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;

        // Botón de flecha estilo Excel
        const btnFilter = document.createElement('button');
        btnFilter.className = 'th-filter-btn';
        btnFilter.innerHTML = '▼';
        
        // Contenedor del menú desplegable
        const menu = document.createElement('div');
        menu.className = 'excel-filter-menu';

        btnFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.excel-filter-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            
            poblarOpcionesFiltro(col.key, menu);
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });

        th.appendChild(btnFilter);
        th.appendChild(menu);
        theadRow.appendChild(th);
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.excel-filter-menu').forEach(m => m.style.display = 'none');
    });
}

function poblarOpcionesFiltro(key, menuContainer) {
    menuContainer.innerHTML = '';

    const valoresUnicos = [...new Set(rawData.map(item => item[key] ? String(item[key]).trim() : '(Vacíos)'))].sort();

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'filter-actions';
    
    const btnTodos = document.createElement('button');
    btnTodos.textContent = 'Todos';
    btnTodos.onclick = (e) => {
        e.stopPropagation();
        delete activeFilters[key];
        aplicarFiltros();
        menuContainer.style.display = 'none';
    };

    actionsDiv.appendChild(btnTodos);
    menuContainer.appendChild(actionsDiv);

    valoresUnicos.forEach(val => {
        const label = document.createElement('label');
        label.onclick = (e) => e.stopPropagation();

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.value = val;

        if (activeFilters[key] && activeFilters[key].includes(val)) {
            chk.checked = true;
        }

        chk.addEventListener('change', () => {
            if (!activeFilters[key]) activeFilters[key] = [];
            
            if (chk.checked) {
                activeFilters[key].push(val);
            } else {
                activeFilters[key] = activeFilters[key].filter(v => v !== val);
                if (activeFilters[key].length === 0) delete activeFilters[key];
            }
            aplicarFiltros();
        });

        label.appendChild(chk);
        label.appendChild(document.createTextNode(` ${val}`));
        menuContainer.appendChild(label);
    });
}

function aplicarFiltros() {
    filteredData = rawData.filter(row => {
        for (let key in activeFilters) {
            const rowVal = row[key] ? String(row[key]).trim() : '(Vacíos)';
            if (activeFilters[key].length > 0 && !activeFilters[key].includes(rowVal)) {
                return false;
            }
        }
        return true;
    });
    renderTabla(filteredData);
}

function renderTabla(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    data.forEach((row) => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;

        COL_MAP.forEach(col => {
            const key = col.key;
            const td = document.createElement('td');
            td.textContent = row[key] || '';
            
            if (currentUser) {
                let esEditable = false;
                if (currentUser === 'Edgar') esEditable = true;
                else if (currentUser === 'Ernestina' && (key === 'tr4' || key === 'estado')) esEditable = true;

                if (esEditable) {
                    td.contentEditable = "true";
                    td.style.background = "#ffffff";
                    td.style.border = "1px solid #002060";
                    td.addEventListener('blur', () => guardarCelda(row.id, key, td.textContent.trim()));
                } else {
                    td.contentEditable = "false";
                    td.style.background = "#f1f5f9";
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

    btnLogin.addEventListener('click', () => { loginModal.style.display = 'flex'; txtUser.focus(); });
    btnCancelLogin.addEventListener('click', () => { loginModal.style.display = 'none'; });
    
    btnConfirmLogin.addEventListener('click', () => {
        currentUser = txtUser.value.trim();
        currentPass = txtPass.value;
        loginModal.style.display = 'none';
        editorPanel.style.display = 'flex';
        lblUsuario.textContent = currentUser;
        btnLogin.style.display = 'none';
        renderTabla(filteredData);
    });

    btnLogout.addEventListener('click', () => {
        currentUser = null;
        currentPass = null;
        editorPanel.style.display = 'none';
        btnLogin.style.display = 'inline-block';
        renderTabla(filteredData);
    });
}
