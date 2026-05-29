from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError
import time
import os  # ← adicionar

db = SQLAlchemy()

def init_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        "DATABASE_URL",
        "mysql+mysqlconnector://root:root@mysql57:3306/privilege_management"  # fallback local
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        conectado = False
        for i in range(15):
            try:
                db.create_all()
                print("✅ Banco conectado e tabelas criadas!")
                conectado = True
                break
            except OperationalError as e:
                print(f"⏳ [{i+1}/15] MySQL ainda não está pronto, aguardando... ({e})")
                time.sleep(3)

        if not conectado:
            print("❌ Não foi possível conectar ao banco após várias tentativas.")
            raise RuntimeError("Falha ao conectar ao banco de dados.")