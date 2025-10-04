# ./services/analyzer-service/src/app.py

import os
from flask import Flask, jsonify, request
from flasgger import Swagger

from service.analyzer import analyzer_bp, openapi_spec_analyzer

app = Flask(__name__)

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Analyzer Service API",
        "description": "Language-agnostic code analyzer (functions, classes, imports, includes, child-components, etc.)",
        "version": "1.0.0"
    },
    "basePath": "/",
    "schemes": ["http"],
    "securityDefinitions": {
        "ApiKeyAuth": {
            "type": "apiKey",
            "name": "X-API-Key",
            "in": "header",
            "description": "Provide your API key in the X-API-Key header"
        }
    },
    "security": [{"ApiKeyAuth": []}],
    "paths": {}
}

swagger = Swagger(app, template=swagger_template)

API_KEY = os.environ.get("API_KEY", "changeme")

# Protect all /api/* routes; allow Swagger UI assets
@app.before_request
def _require_api_key():
    path = request.path
    if path.startswith("/apidocs") or path.startswith("/flasgger_static") or path == "/apispec_1.json":
        return None
    if path.startswith("/api/"):
        key = request.headers.get("X-API-Key")
        if not key or key != API_KEY:
            return jsonify({"error": "unauthorized"}), 401

# Register blueprint and expose its OpenAPI paths in Swagger UI
app.register_blueprint(analyzer_bp)
swagger.template["paths"].update(openapi_spec_analyzer["paths"])

# Serve combined OpenAPI JSON (same as what UI renders)
@app.route("/api/openapi.json", methods=["GET"])
def openapi_json():
    return jsonify({
        "swagger": "2.0",
        "info": {"title": "Analyzer Service API", "version": "1.0.0"},
        "basePath": "/",
        "schemes": ["http"],
        "securityDefinitions": swagger_template["securityDefinitions"],
        "security": swagger_template["security"],
        "paths": openapi_spec_analyzer["paths"]
    })

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3002)
