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
        "description": "Scans the /project directory, builds a folder tree in Neo4j, "
                       "and publishes progress updates to the WebSocket service.",
        "version": "1.1.0"
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
                "summary": "Trigger the full project analysis for /project",
                "description": "Recursively scans the /project directory, builds a Neo4j folder tree, "
                               "and sends progress updates to the WebSocket server.",
                "tags": ["Analyzer"],
                "security": [{"ApiKeyAuth": []}],
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
                "summary": "Retrieve the OpenAPI specification",
                "tags": ["System"],
                "responses": {
                    "200": {"description": "JSON spec returned"}
                }
            }
        }
    }
}

swagger = Swagger(app, template=swagger_template)
API_KEY = os.environ.get("API_KEY", "changeme")


@app.before_request
def _require_api_key():
    """Protect all /api/* routes except Swagger UI."""
    path = request.path
    if path.startswith("/apidocs") or path.startswith("/flasgger_static") or path == "/apispec_1.json":
        return None
    if path.startswith("/api/"):
        key = request.headers.get("X-API-Key")
        if not key or key != API_KEY:
            return jsonify({"error": "unauthorized"}), 401


@app.route("/api/analyze", methods=["POST"])
def start_tree_analysis():
    """
    Trigger full project analysis.
    ---
    tags:
      - Analyzer
    security:
      - ApiKeyAuth: []
    responses:
      200:
        description: Analysis started successfully
    """
    def run_analyzer():
        path = "/project"
        print(f"[INFO] Starting analysis for {path}")
        try:
            parser = TreeParser(path)
            parser.traverse_tree()
            print(f"[SUCCESS] Completed analysis for {path}")
        except Exception as e:
            print(f"[ERROR] Analyzer failed: {e}")

    Thread(target=run_analyzer, daemon=True).start()
    return jsonify({"status": "started", "path": "/project"})


@app.route("/api/openapi.json", methods=["GET"])
def openapi_json():
    """Expose OpenAPI specification as JSON."""
    return jsonify(swagger.template)


@app.route("/api/health", methods=["GET"])
def health():
    """Simple health endpoint."""
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3002)
