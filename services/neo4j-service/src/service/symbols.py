# ./services/neo4j-service/src/service/symbols.py

from flask import Blueprint, jsonify, current_app

symbols_bp = Blueprint("symbols", __name__)
openapi_spec_symbols = {
    "paths": {
        "/api/graph/symbols": {
            "get": {
                "summary": "List all symbols from Neo4j",
                "tags": ["Symbols"],
                "responses": {
                    "200": {"description": "List of symbols"},
                    "500": {"description": "Error retrieving symbols"}
                }
            }
        }
    }
}

@symbols_bp.route("/api/graph/symbols", methods=["GET"])
def list_symbols():
    """Return all Symbol nodes with id + name"""
    driver = current_app.config["NEO4J_DRIVER"]
    database = current_app.config["NEO4J_DATABASE"]
    symbols = []

    try:
        with driver.session(database=database) as session:
            q = """
            MATCH (s:Symbol)
            RETURN s.id AS id, s.name AS name
            """
            for record in session.run(q):
                symbols.append({
                    "id": record["id"],
                    "name": record["name"]
                })
        return jsonify({"symbols": symbols}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
