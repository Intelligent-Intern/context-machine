# ./services/neo4j-service/src/app.py

import os
from flask import Flask, jsonify, request
from neo4j import GraphDatabase
from flasgger import Swagger
from functools import wraps

from service.nodes import nodes_bp, openapi_spec_nodes
from service.edges import edges_bp, openapi_spec
from service.bulk import bulk_bp, openapi_spec_bulk

app = Flask(__name__)

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Neo4j Service API",
        "description": "API for interacting with Neo4j nodes, edges and bulk operations",
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

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-API-Key")
        if not key or key != API_KEY:
            return jsonify({"error": "unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

NEO4J_URI = os.environ.get("SERVICE_NEO4J_URI")
auth = os.environ.get("SERVICE_NEO4J_AUTH", "neo4j/test12345").split("/")
NEO4J_USER, NEO4J_PASSWORD = auth[0], auth[1] if len(auth) > 1 else None
NEO4J_DATABASE = os.environ.get("SERVICE_NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
app.config["NEO4J_DRIVER"] = driver
app.config["NEO4J_DATABASE"] = NEO4J_DATABASE

app.register_blueprint(nodes_bp)
app.register_blueprint(edges_bp)
app.register_blueprint(bulk_bp)

swagger.template["paths"].update(openapi_spec["paths"])
swagger.template["paths"].update(openapi_spec_nodes["paths"])
swagger.template["paths"].update(openapi_spec_bulk["paths"])

@app.route("/api/openapi.json", methods=["GET"])
@require_api_key
def combined_openapi_spec():
    try:
        spec = {
            "swagger": "2.0",
            "info": {
                "title": "Neo4j Service API",
                "version": "1.0.0"
            },
            "basePath": "/",
            "schemes": ["http"],
            "securityDefinitions": swagger_template["securityDefinitions"],
            "security": swagger_template["security"],
            "paths": {}
        }
        spec["paths"].update(openapi_spec["paths"])
        spec["paths"].update(openapi_spec_nodes["paths"])
        spec["paths"].update(openapi_spec_bulk["paths"])
        return jsonify(spec)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/health", methods=["GET"])
@require_api_key
def health():
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            session.run("RETURN 1")
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3001)
