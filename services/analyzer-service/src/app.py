# ./services/analyzer-service/src/app.py

import os
from flask import Flask, jsonify, request
from flasgger import Swagger
from threading import Thread
from service.parsers.tree_parser import TreeParser

app = Flask(__name__)

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Analyzer Service API",
        "description": "Recursive tree analyzer that scans a project folder and pushes AST data into the Neo4j service.",
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

# Protect all /api/* routes except Swagger UI
@app.before_request
def _require_api_key():
    path = request.path
    if path.startswith("/apidocs") or path.startswith("/flasgger_static") or path == "/apispec_1.json":
        return None
    if path.startswith("/api/"):
        key = request.headers.get("X-API-Key")
        if not key or key != API_KEY:
            return jsonify({"error": "unauthorized"}), 401

# ------------------------------------------------------------------------------

@app.route("/api/analyze", methods=["POST"])
def start_tree_analysis():
    """
    Trigger a full project analysis
    ---
    tags:
      - TreeAnalyzer
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            path:
              type: string
              example: "/project"
    responses:
      200:
        description: Analysis started
    """
    data = request.get_json(force=True) if request.data else {}
    path = data.get("path", "/project")

    def run_analyzer(target_path):
        print(f"[INFO] Starting tree analysis for {target_path}")
        try:
            parser = TreeParser(target_path)
            parser.traverse()
            print(f"[SUCCESS] Completed tree analysis for {target_path}")
        except Exception as e:
            print(f"[ERROR] Analyzer failed: {e}")

    Thread(target=run_analyzer, args=(path,), daemon=True).start()
    return jsonify({"status": "started", "path": path})

# ------------------------------------------------------------------------------

@app.route("/api/openapi.json", methods=["GET"])
def openapi_json():
    return jsonify({
        "swagger": "2.0",
        "info": {"title": "Analyzer Service API", "version": "1.0.0"},
        "basePath": "/",
        "schemes": ["http"],
        "securityDefinitions": swagger_template["securityDefinitions"],
        "security": swagger_template["security"],
        "paths": swagger.template["paths"]
    })

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3002)
