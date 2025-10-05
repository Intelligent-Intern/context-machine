import os
from flask import Flask, jsonify
from neo4j import GraphDatabase

from service.bulk import bulk_bp, openapi_spec_bulk
from service.symbols import symbols_bp, openapi_spec_symbols

app = Flask(__name__)

NEO4J_URI = os.getenv("SERVICE_NEO4J_URI", "bolt://context-machine-neo4j:7687")
auth = os.getenv("SERVICE_NEO4J_AUTH", "neo4j/test12345").split("/")
NEO4J_USER, NEO4J_PASSWORD = auth[0], auth[1] if len(auth) > 1 else None
NEO4J_DATABASE = os.getenv("SERVICE_NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
app.config["NEO4J_DRIVER"] = driver
app.config["NEO4J_DATABASE"] = NEO4J_DATABASE

app.register_blueprint(bulk_bp)
app.register_blueprint(symbols_bp)

@app.route("/api/health", methods=["GET"])
def health():
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            session.run("RETURN 1")
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3001, debug=False, use_reloader=False)
