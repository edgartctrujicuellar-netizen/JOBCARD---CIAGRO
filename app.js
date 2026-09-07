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
    inicializarBuscadorGlobal();
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
    if (!theadRow) return;
    theadRow.innerHTML = '';

    COL_MAP.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;

        const btnFilter = document.createElement('button');
        btnFilter.className = 'th-filter-btn';
        btnFilter.innerHTML = '▼';
        
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

    // Buscador interno del menú
    const inputSearch = document.createElement('input');
    inputSearch.type = 'text';
    inputSearch.placeholder = 'Buscar en lista...';
    inputSearch.className = 'excel-filter-search';
    inputSearch.onclick = (e) => e.stopPropagation();
    
    menuContainer.appendChild(inputSearch);

    const listContainer = document.createElement('div');
    listContainer.className = 'excel-filter-list';

    // Opción "Seleccionar Todo"
    const labelAll = document.createElement('label');
    labelAll.className = 'select-all-label';
    labelAll.onclick = (e) => e.stopPropagation();

    const chkAll = document.createElement('input');
    chkAll.type = 'checkbox';
    
    const estaFiltrado = activeFilters[key] && activeFilters[key].length > 0;
    chkAll.checked = !estaFiltrado || activeFilters[key].length === valoresUnicos.length;

    labelAll.appendChild(chkAll);
    labelAll.appendChild(document.createTextNode(' (Seleccionar Todo)'));
    listContainer.appendChild(labelAll);

    // Lista de valores
    const checkBoxes = [];
    valoresUnicos.forEach(val => {
        const label = document.createElement('label');
        label.className = 'filter-item-label';
        label.onclick = (e) => e.stopPropagation();

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.value = val;

        if (!estaFiltrado || (activeFilters[key] && activeFilters[key].includes(val))) {
            chk.checked = true;
        }

        chk.addEventListener('change', () => {
            asignarFiltroPorCheckboxes(key, valoresUnicos, checkBoxes, chkAll);
        });

        checkBoxes.push({ chk, val, label });
        label.appendChild(chk);
        label.appendChild(document.createTextNode(` ${val}`));
        listContainer.appendChild(label);
    });

    // Evento Seleccionar Todo
    chkAll.addEventListener('change', () => {
        checkBoxes.forEach(item => {
            if (item.label.style.display !== 'none') {
                item.chk.checked = chkAll.checked;
            }
        });
        asignarFiltroPorCheckboxes(key, valoresUnicos, checkBoxes, chkAll);
    });

    // Evento de búsqueda rápida dentro del menú
    inputSearch.addEventListener('input', () => {
        const term = inputSearch.value.toLowerCase();
        checkBoxes.forEach(item => {
            if (item.val.toLowerCase().includes(term)) {
                item.label.style.display = 'block';
            } else {
                item.label.style.display = 'none';
            }
        });
    });

    menuContainer.appendChild(listContainer);
}

function asignarFiltroPorCheckboxes(key, todosLosValores, checkBoxes, chkAll) {
    const marcados = checkBoxes.filter(i => i.chk.checked).map(i => i.val);
    
    if (marcados.length === todosLosValores.length || marcados.length === 0) {
        delete activeFilters[key];
        chkAll.checked = true;
    } else {
        activeFilters[key] = marcados;
        chkAll.checked = false;
    }
    aplicarFiltros();
}

function inicializarBuscadorGlobal() {
    const inputBuscar = document.querySelector('input[placeholder="Buscar..."]') || document.querySelector('input[type="text"]');
    if (!inputBuscar) return;

    inputBuscar.addEventListener('input', () => {
        aplicarFiltros();
    });
}

function aplicarFiltros() {
    const inputBuscar = document.querySelector('input[placeholder="Buscar..."]') || document.querySelector('input[type="text"]');
    const busquedaGlobal = inputBuscar ? inputBuscar.value.toLowerCase().trim() : '';

    filteredData = rawData.filter(row => {
        // 1. Filtros por columna estilo Excel
        for (let key in activeFilters) {
            const rowVal = row[key] ? String(row[key]).trim() : '(Vacíos)';
            if (activeFilters[key].length > 0 && !activeFilters[key].includes(rowVal)) {
                return false;
            }
        }

        // 2. Buscador global (busca coincidencias en cualquier columna)
        if (busquedaGlobal) {
            const coincideEnAlgunaColumna = COL_MAP.some(col => {
                const val = row[col.key] ? String(row[col.key]).toLowerCase() : '';
                return val.includes(busquedaGlobal);
            });
            if (!coincideEnAlgunaColumna) return false;
        }

        return true;
    });

    renderTabla(filteredData);
}

function renderTabla(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
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

    if (btnLogin) btnLogin.addEventListener('click', () => { loginModal.style.display = 'flex'; txtUser.focus(); });
    if (btnCancelLogin) btnCancelLogin.addEventListener('click', () => { loginModal.style.display = 'none'; });
    
    if (btnConfirmLogin) {
        btnConfirmLogin.addEventListener('click', () => {
            currentUser = txtUser.value.trim();
            currentPass = txtPass.value;
            loginModal.style.display = 'none';
            editorPanel.style.display = 'flex';
            lblUsuario.textContent = currentUser;
            btnLogin.style.display = 'none';
            renderTabla(filteredData);
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            currentUser = null;
            currentPass = null;
            editorPanel.style.display = 'none';
            btnLogin.style.display = 'inline-block';
            renderTabla(filteredData);
        });
    }
}
