from flask import Flask, jsonify, request, send_from_directory
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import os

# Carga variables desde un archivo .env si existe (solo para desarrollo local;
# en Render las variables se configuran directamente en el panel de Environment)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__, static_folder='.')

# Cadena de conexión: se lee desde una variable de entorno (nunca hardcodeada en el código)
NEON_DB_URL = os.environ.get("NEON_DB_URL")
if not NEON_DB_URL:
    raise RuntimeError(
        "Falta la variable de entorno NEON_DB_URL. "
        "Configúrala en Render (Environment) o en tu archivo .env local."
    )

# Hashes de usuarios: también desde variables de entorno
USUARIOS_HASH = {
    "Edgar": os.environ.get("USUARIO_EDGAR_HASH"),
    "Ernestina": os.environ.get("USUARIO_ERNESTINA_HASH"),
}
if not all(USUARIOS_HASH.values()):
    raise RuntimeError(
        "Faltan variables de entorno USUARIO_EDGAR_HASH y/o USUARIO_ERNESTINA_HASH."
    )

def get_db_connection():
    return psycopg2.connect(NEON_DB_URL)

def verificar_credenciales(usuario, password):
    if not usuario or not password:
        return False
    pass_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    return USUARIOS_HASH.get(usuario) == pass_hash

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

@app.route('/api/reservas', methods=['GET'])
def get_reservas():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM reservas ORDER BY id ASC;")
        data = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/guardar-celda', methods=['POST'])
def guardar_celda():
    data = request.json or {}
    user = data.get('usuario')
    pas = data.get('password')
    row_id = data.get('id')
    campo = data.get('campo')
    valor = data.get('valor')

    if not verificar_credenciales(user, pas):
        return jsonify({"status": "error", "message": "Acceso denegado: Credenciales inválidas"}), 403

    # Permisos por rol: Ernestina solo edita 'tr4' y 'estado'
    if user == "Ernestina" and campo not in ["tr4", "estado"]:
        return jsonify({"status": "error", "message": "Ernestina solo tiene permitido editar TR4 y Estado"}), 403

    campos_permitidos = [
        "id_reserva", "tr4", "pin_sn", "modelo", "cliente",
        "fecha_creacion", "creado_por", "tecnico", "estado",
        "estado_unidad", "actividades"
    ]
    if campo not in campos_permitidos:
        return jsonify({"status": "error", "message": "Campo no editable"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        query = f"UPDATE reservas SET {campo} = %s, ultima_modificacion = NOW() WHERE id = %s;"
        cur.execute(query, (valor, row_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Registro actualizado en Neon.tech"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)