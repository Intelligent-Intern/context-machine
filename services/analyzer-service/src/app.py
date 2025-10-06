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
        "description": "Analyzes the /project directory, builds a Neo4j tree + AST, "
                       "and resolves cross-file CALL relationships.",
        "version": "2.0.0"
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
    "paths": {
        "/api/analyze": {
            "post": {
                "summary": "Run full project analysis (tree + AST + CALL resolution)",
                "tags": ["Analyzer"],
                "responses": {
                    "200": {
                        "description": "Analysis started successfully",
                        "examples": {"application/json": {"status": "started", "path": "/project"}}
                    },
                    "401": {"description": "Unauthorized"}
                }
            }
        },
        "/api/health": {
            "get": {
                "summary": "Health check",
                "tags": ["System"],
                "responses": {
                    "200": {"description": "OK"},
                    "500": {"description": "Error"}
                }
            }
        },
        "/api/openapi.json": {
            "get": {
                "summary": "Retrieve OpenAPI specification",
                "tags": ["System"],
                "responses": {"200": {"description": "Spec returned"}}
            }
        }
    }
}

swagger = Swagger(app, template=swagger_template)

API_KEY = os.getenv("API_KEY", "changeme")


@app.before_request
def _require_api_key():
    """Protect all /api routes except Swagger UI"""
    path = request.path
    if path.startswith("/apidocs") or path.startswith("/flasgger_static") or path == "/apispec_1.json":
        return None
    if path.startswith("/api/"):
        key = request.headers.get("X-API-Key")
        if not key or key != API_KEY:
            return jsonify({"error": "unauthorized"}), 401


@app.route("/api/analyze", methods=["POST"])
def start_analysis():
    """
    Start full project analysis.
    Scans the /project directory, sends nodes and edges to Neo4j,
    then resolves CALL relationships across files.
    """
    def run_analysis():
        project_path = "/project"
        print(f"[INFO] Starting full analysis for {project_path}")
        try:
            tree = TreeParser(project_path)
            tree.traverse_tree()
        except Exception as e:
            print(f"[ERROR] Analyzer failed: {e}")

    Thread(target=run_analysis, daemon=True).start()
    return jsonify({"status": "started", "path": "/project"})


@app.route("/api/openapi.json", methods=["GET"])
def openapi_json():
    """Return OpenAPI specification"""
    return jsonify(swagger.template)


@app.route("/api/health", methods=["GET"])
def health():
    """Health check"""
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3002, debug=False, use_reloader=False)
