from flask import Flask, render_template
from flask_cors import CORS
from db import init_db
from datetime import timedelta
from controller.empresa_controller import empresa_bp
from controller.pedido_controller import pedido_bp
from controller.usuario_controller import usuario_bp
import os
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager

def create_app():
    load_dotenv()

    app = Flask(__name__, template_folder="view", static_folder="view/static")
    CORS(app)

    # Configuração JWT
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    jwt = JWTManager(app)

    init_db(app)

    app.register_blueprint(empresa_bp, url_prefix="/empresas")
    app.register_blueprint(pedido_bp, url_prefix='/pedidos')
    app.register_blueprint(usuario_bp, url_prefix='/usuarios')

    @app.route("/")
    def login_view():
        return render_template("login.html")
    
    @app.route("/empresas-view")
    def empresa_view():
        return render_template("empresa.html")
    
    @app.route("/pedidos-view")
    def pedidos_view():
        return render_template("pedidos.html")
    
    @app.route("/usuarios-view")
    def admin_view():
        return render_template("admin.html")

    @app.route("/dashboard-view")
    def dashboard_view():
        return render_template("dashboard.html")
        
    return app

app = create_app()

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=False)