from flask import Flask, jsonify, request, send_from_directory
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import os

app = Flask(__name__, static_folder='.')

# Cadena de conexión de tu proyecto en Neon.tech
NEON_DB_URL = "postgresql://neondb_owner:npg_yYSpJ4cMtL2H@ep-damp-cake-ac9h7dej-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

USUARIOS_HASH = {
    "Edgar": "3015a9b753f2c52cb3e42994821a81e9f0d046f14b62db48bfef278631b0e352",      # Admin
    "Ernestina": "9f77f0a6d36e2f41d3fa54e568469e88698184e93d186c2e36d400199464618e" # Restringida
}

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
