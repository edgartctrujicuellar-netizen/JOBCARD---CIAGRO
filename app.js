let rawData = [];
let filteredData = [];
let activeFilters = {};
let currentUser = null;
let currentPass = null;

// COL_MAP actualizado: Se elimina por completo la entrada de técnico
const COL_MAP = [
    { key: 'id_reserva', label: 'ID RESERVA' },
    { key: 'tr4', label: 'TR4' },
    { key: 'pin_sn', label: 'PIN / SN' },
    { key: 'modelo', label: 'MODELO' },
    { key: 'cliente', label: 'CLIENTE' },
    { key: 'fecha_creacion', label: 'FECHA CREACIÓN' },
    { key: 'creado_por', label: 'CREADO POR' },
    { key: 'estado', label: 'ESTADO' },
    { key: 'estado_unidad', label: 'ESTADO UNIDAD' },
    { key: 'actividades', label: 'ACTIVIDADES' }
];

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    inicializarLogin();
    inicializarBuscadoresYSelects();
});

async function cargarDatos() {
    try {
        const res = await fetch('/api/reservas');
        rawData = await res.json();
        filteredData = [...rawData];
        
        poblarSelectEstado();
        construirEncabezadosConFiltros();
        renderTabla(filteredData);
    } catch (err) {
        console.error("Error al cargar datos desde Neon:", err);
    }
}

// Puebla la lista desplegable de la parte superior únicamente con los estados de la tarjeta
function poblarSelectEstado() {
    const selectEstado = document.getElementById('filterEstado');
    if (!selectEstado) return;

    const estadosUnicos = [...new Set(rawData.map(row => row.estado ? String(row.estado).trim() : '').filter(Boolean))].sort();
    
    selectEstado.innerHTML = `<option value="">Todos los Estados</option>`;
    estadosUnicos.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        selectEstado.appendChild(opt);
    });

    selectEstado.onchange = () => aplicarFiltros();
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

    const inputSearch = document.createElement('input');
    inputSearch.type = 'text';
    inputSearch.placeholder = 'Buscar...';
    inputSearch.className = 'excel-filter-search';
    inputSearch.onclick = (e) => e.stopPropagation();
    menuContainer.appendChild(inputSearch);

    const listContainer = document.createElement('div');
    listContainer.className = 'excel-filter-list';

    // Checkbox "Seleccionar Todo"
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

    const checkBoxes = [];
    valoresUnicos.forEach(val => {
        const label = document.createElement('label');
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

    chkAll.addEventListener('change', () => {
        checkBoxes.forEach(item => {
            if (item.label.style.display !== 'none') {
                item.chk.checked = chkAll.checked;
            }
        });
        asignarFiltroPorCheckboxes(key, valoresUnicos, checkBoxes, chkAll);
    });

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

function inicializarBuscadoresYSelects() {
    const inputBuscar = document.querySelector('#searchInput');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => aplicarFiltros());
    }

    const filterAnio = document.getElementById('filterAnio');
    const filterMes = document.getElementById('filterMes');
    const filterSemana = document.getElementById('filterSemana');

    if (filterAnio) filterAnio.addEventListener('change', () => aplicarFiltros());
    if (filterMes) filterMes.addEventListener('change', () => aplicarFiltros());
    if (filterSemana) filterSemana.addEventListener('change', () => aplicarFiltros());
}

function aplicarFiltros() {
    const inputBuscar = document.querySelector('#searchInput');
    const busquedaGlobal = inputBuscar ? inputBuscar.value.toLowerCase().trim() : '';

    const selectEstado = document.getElementById('filterEstado');
    const valEstado = selectEstado ? selectEstado.value.trim() : '';

    const valAnio = document.getElementById('filterAnio') ? document.getElementById('filterAnio').value : '';
    const valMes = document.getElementById('filterMes') ? document.getElementById('filterMes').value : '';
    const valSemana = document.getElementById('filterSemana') ? document.getElementById('filterSemana').value : '';

    filteredData = rawData.filter(row => {
        // 1. Filtro por Estado de Tarjeta
        if (valEstado && (row.estado || '').trim() !== valEstado) return false;

        // 2. Filtros por Fechas (Año, Mes, Semana)
        if (row.fecha_creacion) {
            const fechaStr = String(row.fecha_creacion);
            
            if (valAnio && !fechaStr.includes(valAnio)) return false;
            if (valMes && !fechaStr.includes(`-${valMes}-`) && !fechaStr.includes(`/${valMes}/`)) return false;
            
            if (valSemana) {
                const fechaObj = new Date(row.fecha_creacion);
                if (!isNaN(fechaObj.getTime())) {
                    const numeroSemana = obtenerNumeroSemana(fechaObj);
                    const semanaSeleccionada = parseInt(valSemana.split('-W')[1], 10);
                    if (numeroSemana !== semanaSeleccionada) return false;
                }
            }
        }

        // 3. Filtros estilo Excel
        for (let key in activeFilters) {
            const rowVal = row[key] ? String(row[key]).trim() : '(Vacíos)';
            if (activeFilters[key].length > 0 && !activeFilters[key].includes(rowVal)) {
                return false;
            }
        }

        // 4. Buscador Global
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

// Cálculo auxiliar para la semana del año
function obtenerNumeroSemana(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - startOfYear) / 86400000) + 1) / 7);
}

function renderTabla(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach((row) => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;

        // Resaltar toda la fila en rojo si TR4 está vacío o no existe
        const tr4Val = row.tr4 ? String(row.tr4).trim() : '';
        if (!tr4Val || tr4Val === '' || tr4Val.toUpperCase() === 'SIN TR4') {
            tr.classList.add('tr4-vacio');
        }

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
