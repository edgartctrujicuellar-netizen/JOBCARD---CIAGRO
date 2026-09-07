let rawData = [];

let currentUser = null;
let currentPass = null;

/* ========================= */
/* INICIO */
/* ========================= */

document.addEventListener('DOMContentLoaded', () => {

```
cargarDatos();

configurarLogin();
```

});

/* ========================= */
/* CONFIGURAR LOGIN */
/* ========================= */

function configurarLogin() {

```
const loginOpenBtn = document.getElementById('loginOpenBtn');

const loginModal = document.getElementById('loginModal');

const cancelLoginBtn = document.getElementById('cancelLoginBtn');

const loginBtn = document.getElementById('loginBtn');

const logoutBtn = document.getElementById('logoutBtn');

const passwordInput = document.getElementById('passwordInput');

const loginError = document.getElementById('loginError');


/* ABRIR VENTANA */

loginOpenBtn.addEventListener('click', () => {

    loginModal.style.display = 'flex';

    passwordInput.value = '';

    loginError.textContent = '';

    passwordInput.focus();

});


/* CANCELAR */

cancelLoginBtn.addEventListener('click', () => {

    cerrarLogin();

});


/* INGRESAR */

loginBtn.addEventListener('click', () => {

    iniciarSesion();

});


/* ENTER EN CONTRASEÑA */

passwordInput.addEventListener('keydown', (event) => {

    if (event.key === 'Enter') {

        iniciarSesion();

    }

});


/* CERRAR SESIÓN */

logoutBtn.addEventListener('click', () => {

    cerrarSesion();

});


/* CERRAR MODAL HACIENDO CLIC AFUERA */

loginModal.addEventListener('click', (event) => {

    if (event.target === loginModal) {

        cerrarLogin();

    }

});
```

}

/* ========================= */
/* INICIAR SESIÓN */
/* ========================= */

async function iniciarSesion() {

```
const usuarioSelect = document.getElementById('usuarioSelect');

const passwordInput = document.getElementById('passwordInput');

const loginError = document.getElementById('loginError');


const usuario = usuarioSelect.value;

const password = passwordInput.value.trim();


if (!password) {

    loginError.textContent =
        'Ingrese su contraseña.';

    passwordInput.focus();

    return;

}


/*
 * Guardamos temporalmente las credenciales.
 * El servidor las comprobará cuando se intente
 * guardar una modificación.
 */

currentUser = usuario;

currentPass = password;


/*
 * Volvemos a dibujar la tabla para aplicar
 * los permisos correspondientes.
 */

renderTabla(rawData);


/* ACTUALIZAR INTERFAZ */

document.getElementById('loginOpenBtn').style.display = 'none';

document.getElementById('userSession').style.display = 'flex';

document.getElementById('loggedUser').textContent =
    'Sesión: ' + currentUser;


cerrarLogin();
```

}

/* ========================= */
/* CERRAR LOGIN */
/* ========================= */

function cerrarLogin() {

```
const loginModal = document.getElementById('loginModal');

loginModal.style.display = 'none';
```

}

/* ========================= */
/* CERRAR SESIÓN */
/* ========================= */

function cerrarSesion() {

```
currentUser = null;

currentPass = null;


document.getElementById('loginOpenBtn').style.display = 'block';

document.getElementById('userSession').style.display = 'none';


renderTabla(rawData);
```

}

/* ========================= */
/* CARGAR DATOS */
/* ========================= */

async function cargarDatos() {

```
try {

    const res = await fetch('/api/reservas');

    if (!res.ok) {

        throw new Error(
            'Error HTTP: ' + res.status
        );

    }

    rawData = await res.json();

    renderTabla(rawData);

} catch (err) {

    console.error(
        'Error al cargar datos desde Neon:',
        err
    );

}
```

}

/* ========================= */
/* RENDERIZAR TABLA */
/* ========================= */

function renderTabla(data) {

```
const tbody =
    document.getElementById('tableBody');

tbody.innerHTML = '';


const campos = [

    'id_reserva',
    'tr4',
    'pin_sn',
    'modelo',
    'cliente',
    'fecha_creacion',
    'creado_por',
    'tecnico',
    'estado',
    'estado_unidad',
    'actividades'

];


data.forEach((row) => {

    const tr =
        document.createElement('tr');

    tr.dataset.id = row.id;


    campos.forEach((key) => {

        const td =
            document.createElement('td');


        td.textContent =
            row[key] || '';


        /* ========================= */
        /* PERMISOS */
        /* ========================= */

        if (currentUser) {

            let esEditable = false;


            /* EDGAR */

            if (currentUser === 'Edgar') {

                esEditable = true;

            }


            /* ERNESTINA */

            else if (currentUser === 'Ernestina') {

                if (
                    key === 'tr4' ||
                    key === 'estado'
                ) {

                    esEditable = true;

                }

            }


            if (esEditable) {

                td.contentEditable = 'true';

                td.style.background =
                    '#ffffff';

                td.style.border =
                    '1px solid #002060';


                td.addEventListener(
                    'blur',
                    () => {

                        guardarCelda(
                            row.id,
                            key,
                            td.textContent.trim()
                        );

                    }
                );

            }

            else {

                td.contentEditable = 'false';

                td.style.background =
                    '#f1f5f9';

            }

        }

        else {

            /*
             * Sin iniciar sesión:
             * todas las celdas quedan bloqueadas.
             */

            td.contentEditable = 'false';

            td.style.background =
                '#f1f5f9';

        }


        tr.appendChild(td);

    });


    tbody.appendChild(tr);

});
```

}

/* ========================= */
/* GUARDAR CELDA */
/* ========================= */

async function guardarCelda(
rowId,
campo,
valor
) {

```
try {

    const res = await fetch(
        '/api/guardar-celda',
        {
            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({

                usuario: currentUser,

                password: currentPass,

                id: rowId,

                campo: campo,

                valor: valor

            })

        }
    );


    const result = await res.json();


    if (!res.ok) {

        alert(
            result.message ||
            'No se pudo guardar el cambio.'
        );

        /*
         * Si las credenciales no son válidas,
         * cerramos la sesión.
         */

        if (res.status === 403) {

            cerrarSesion();

        }

        return;

    }


    /*
     * Actualizamos el dato local para que
     * la búsqueda/renderizado mantenga el cambio.
     */

    const registro =
        rawData.find(
            row => row.id == rowId
        );


    if (registro) {

        registro[campo] = valor;

    }


    console.log(
        'Cambio guardado correctamente.'
    );


} catch (err) {

    console.error(err);

    alert(
        'Error al guardar los cambios en la nube.'
    );

}
```

}

/* ========================= */
/* BUSCADOR */
/* ========================= */

document.addEventListener(
'DOMContentLoaded',
() => {

```
    const searchInput =
        document.getElementById('searchInput');


    searchInput.addEventListener(
        'input',
        () => {

            const texto =
                searchInput.value
                    .toLowerCase()
                    .trim();


            if (!texto) {

                renderTabla(rawData);

                return;

            }


            const filtrados =
                rawData.filter((row) => {

                    return Object.values(row)
                        .some((valor) =>

                            String(valor ?? '')
                                .toLowerCase()
                                .includes(texto)

                        );

                });


            renderTabla(filtrados);

        }
    );

}
```

);
