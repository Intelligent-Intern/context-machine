# ./services/neo4j-service/src/service/bulk.py

from flask import Blueprint, request, jsonify, current_app

bulk_bp = Blueprint("bulk", __name__)

openapi_spec_bulk = {
    "paths": {
        "/api/graph/bulk": {
            "post": {
                "summary": "Bulk insert nodes and relationships",
                "tags": ["Bulk"],
                "security": [{"ApiKeyAuth": []}],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "nodes": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "label": {"type": "string"},
                                                "properties": {"type": "object"}
                                            }
                                        }
                                    },
                                    "edges": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "source": {"type": "string"},
                                                "target": {"type": "string"},
                                                "type": {"type": "string"},
                                                "properties": {"type": "object"}
                                            }
                                        }
                                    }
                                },
                                "required": ["nodes", "edges"]
                            }
                        }
                    }
                },
                "responses": {
                    "201": {"description": "Bulk insert successful"},
                    "400": {"description": "Invalid payload"}
                }
            }
        }
    }
}

@bulk_bp.route("/api/graph/bulk", methods=["POST"])
def bulk_insert():
    data = request.get_json(force=True)
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    if not isinstance(nodes, list) or not isinstance(edges, list):
        return jsonify({"error": "nodes and edges must be lists"}), 400

    driver = current_app.config["NEO4J_DRIVER"]
    database = current_app.config["NEO4J_DATABASE"]

    try:
        with driver.session(database=database) as session:
            for n in nodes:
                label = n.get("label", "Entity")
                props = n.get("properties", {})
                session.run(f"CREATE (a:{label} $props)", props=props)

            for e in edges:
                src = e.get("source")
                tgt = e.get("target")
                rel = e.get("type", "RELATED_TO")
                props = e.get("properties", {})
                query = f"""
                MATCH (a {{id: $src}}), (b {{id: $tgt}})
                MERGE (a)-[r:{rel} $props]->(b)
                """
                session.run(query, src=src, tgt=tgt, props=props)

        return jsonify({"message": "bulk insert complete", "nodes": len(nodes), "edges": len(edges)}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
