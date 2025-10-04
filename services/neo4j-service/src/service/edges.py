# ./services/neo4j-service/src/service/edges.py

from flask import Blueprint, request, jsonify, current_app
from neo4j import GraphDatabase

edges_bp = Blueprint("edges", __name__)

openapi_spec = {
    "paths": {
        "/api/graph/edge": {
            "post": {
                "summary": "Create an edge between two nodes",
                "tags": ["Edges"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "source": {"type": "string"},
                                    "target": {"type": "string"},
                                    "type": {"type": "string"},
                                    "properties": {"type": "object"}
                                },
                                "required": ["source", "target"]
                            }
                        }
                    }
                },
                "responses": {
                    "201": {"description": "Edge created"},
                    "400": {"description": "Missing parameters"}
                }
            }
        },
        "/api/graph/edge/{src}/{tgt}": {
            "delete": {
                "summary": "Delete an edge between two nodes",
                "tags": ["Edges"],
                "parameters": [
                    {"name": "src", "in": "path", "required": True, "schema": {"type": "string"}},
                    {"name": "tgt", "in": "path", "required": True, "schema": {"type": "string"}}
                ],
                "responses": {
                    "200": {"description": "Edge deleted"}
                }
            }
        },
        "/api/graph/edges/{node_id}": {
            "get": {
                "summary": "List all edges connected to a node",
                "tags": ["Edges"],
                "parameters": [
                    {"name": "node_id", "in": "path", "required": True, "schema": {"type": "string"}}
                ],
                "responses": {
                    "200": {"description": "List of edges"}
                }
            }
        }
    }
}

def get_driver():
    return current_app.config["NEO4J_DRIVER"]

@edges_bp.route("/api/openapi.json", methods=["GET"])
def get_openapi_spec():
    return jsonify(openapi_spec)

@edges_bp.route("/api/graph/edge", methods=["POST"])
def create_edge():
    data = request.get_json(force=True)
    src = data.get("source")
    tgt = data.get("target")
    rel = data.get("type", "LINKS_TO")
    props = data.get("properties", {})
    if not src or not tgt:
        return jsonify({"error": "source and target required"}), 400
    query = f"""
    MATCH (a {{id: $src}}), (b {{id: $tgt}})
    MERGE (a)-[r:{rel} $props]->(b)
    RETURN type(r) AS type, properties(r) AS properties
    """
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            r = s.run(query, src=src, tgt=tgt, props=props).single()
            if not r:
                return jsonify({"message": "edge not created"}), 404
            return jsonify({"type": r["type"], "properties": r["properties"]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@edges_bp.route("/api/graph/edge/<src>/<tgt>", methods=["DELETE"])
def delete_edge(src, tgt):
    query = """
    MATCH (a {id: $src})-[r]->(b {id: $tgt})
    DELETE r RETURN count(r) AS deleted
    """
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            c = s.run(query, src=src, tgt=tgt).single()["deleted"]
            return jsonify({"deleted": c})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@edges_bp.route("/api/graph/edges/<node_id>", methods=["GET"])
def get_edges(node_id):
    query = """
    MATCH (n {id: $node_id})-[r]-(m)
    RETURN type(r) AS type, n.id AS source, m.id AS target, properties(r) AS properties
    """
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            res = s.run(query, node_id=node_id)
            edges = [{
                "type": r["type"],
                "source": r["source"],
                "target": r["target"],
                "properties": r["properties"]
            } for r in res]
            return jsonify(edges)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
