# ./services/neo4j-service/src/service/nodes.py

from flask import Blueprint, request, jsonify, current_app
from neo4j import GraphDatabase

nodes_bp = Blueprint("nodes", __name__)

openapi_spec_nodes = {
    "paths": {
        "/api/graph/node": {
            "post": {
                "summary": "Create a node in the graph",
                "tags": ["Nodes"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "label": {"type": "string"},
                                    "properties": {"type": "object"}
                                },
                                "required": ["label"]
                            }
                        }
                    }
                },
                "responses": {
                    "201": {"description": "Node created"},
                    "400": {"description": "Invalid input"}
                }
            }
        },
        "/api/graph/node/{node_id}": {
            "get": {
                "summary": "Retrieve a node by ID",
                "tags": ["Nodes"],
                "parameters": [
                    {"name": "node_id", "in": "path", "required": True, "schema": {"type": "string"}}
                ],
                "responses": {
                    "200": {"description": "Node retrieved"},
                    "404": {"description": "Node not found"}
                }
            },
            "delete": {
                "summary": "Delete a node by ID",
                "tags": ["Nodes"],
                "parameters": [
                    {"name": "node_id", "in": "path", "required": True, "schema": {"type": "string"}}
                ],
                "responses": {
                    "200": {"description": "Node deleted"},
                    "404": {"description": "Node not found"}
                }
            }
        },
        "/api/graph/nodes": {
            "get": {
                "summary": "List all nodes",
                "tags": ["Nodes"],
                "responses": {
                    "200": {"description": "List of nodes"}
                }
            }
        }
    }
}

def get_driver():
    return current_app.config["NEO4J_DRIVER"]

@nodes_bp.route("/api/openapi-nodes.json", methods=["GET"])
def get_openapi_nodes_spec():
    return jsonify(openapi_spec_nodes)

@nodes_bp.route("/api/graph/node", methods=["POST"])
def create_node():
    data = request.get_json(force=True)
    label = data.get("label")
    props = data.get("properties", {})

    if not label:
        return jsonify({"error": "label required"}), 400

    query = f"CREATE (n:{label} $props) RETURN n"
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            r = s.run(query, props=props).single()
            node_data = r["n"]
            return jsonify(node_data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@nodes_bp.route("/api/graph/node/<node_id>", methods=["GET"])
def get_node(node_id):
    query = "MATCH (n {id: $node_id}) RETURN n"
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            r = s.run(query, node_id=node_id).single()
            if not r:
                return jsonify({"error": "not found"}), 404
            return jsonify(r["n"])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@nodes_bp.route("/api/graph/node/<node_id>", methods=["DELETE"])
def delete_node(node_id):
    query = "MATCH (n {id: $node_id}) DETACH DELETE n RETURN count(n) AS deleted"
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            r = s.run(query, node_id=node_id).single()
            count = r["deleted"]
            if count == 0:
                return jsonify({"error": "not found"}), 404
            return jsonify({"deleted": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@nodes_bp.route("/api/graph/nodes", methods=["GET"])
def list_nodes():
    query = "MATCH (n) RETURN labels(n) AS labels, properties(n) AS properties LIMIT 100"
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            result = s.run(query)
            nodes = [{"labels": r["labels"], "properties": r["properties"]} for r in result]
            return jsonify(nodes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
