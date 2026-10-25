import logging

from flask import Flask
from flask_cors import CORS
from pymongo.errors import PyMongoError
from werkzeug.exceptions import HTTPException

from config import Config
from models import DatabaseError, get_client, init_db
from routes import register_blueprints
from utils import error_response, success_response

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    problems = Config.fatal_problems()
    if problems:
        raise RuntimeError("Invalid configuration: " + " ".join(problems))
    for warning in Config.warnings():
        logger.warning(warning)

    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
    app.url_map.strict_slashes = False

    CORS(
        app,
        resources={r"/*": {"origins": Config.CORS_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    init_db()  # logs on failure, never crashes the app
    register_blueprints(app)
    register_error_handlers(app)

    @app.route("/", methods=["GET"])
    def index():
        return success_response("WanderAI API is running.")

    @app.route("/health", methods=["GET"])
    @app.route("/api/health", methods=["GET"])
    def health():
        try:
            get_client().admin.command("ping")
            return success_response("Service is running.", {"status": "healthy", "database": "connected"})
        except (DatabaseError, PyMongoError, Exception) as exc:
            logger.warning("Database ping failed during health check: %s", exc)
            return error_response("Service is running but the database is unavailable.", 503)

    return app


def register_error_handlers(app: Flask):
    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        return error_response(exc.description or exc.name, exc.code or 500)

    @app.errorhandler(DatabaseError)
    @app.errorhandler(PyMongoError)
    def handle_database_error(exc):
        logger.error("Database error (%s).", exc.__class__.__name__)
        return error_response("The database is currently unavailable. Please try again later.", 503)

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc):
        logger.exception("Unhandled server error.")
        return error_response("An unexpected server error occurred.", 500)


app = create_app()

if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)