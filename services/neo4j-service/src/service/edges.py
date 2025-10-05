# ./services/neo4j-service/src/service/edges.py

from flask import Blueprint, request, jsonify, current_app
from neo4j import GraphDatabase

edges_bp = Blueprint("edges", __name__)

def get_driver():
    return current_app.config["NEO4J_DRIVER"]

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
    MATCH (a {{path: $src}}), (b {{name: $tgt}})
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


@edges_bp.route("/api/graph/bulk", methods=["POST"])
def bulk_insert():
    """
    Accepts bulk insert from analyzer:
    { "nodes": [...], "edges": [...] }
    """
    data = request.get_json(force=True)
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    driver = get_driver()
    db = current_app.config["NEO4J_DATABASE"]

    try:
        with driver.session(database=db) as session:
            # --- NODES -------------------------------------------------
            for n in nodes:
                label = n.get("label", "Symbol")
                name = n.get("name")
                path = n.get("path")
                lang = n.get("language")
                props = n.get("properties", {})

                q = f"""
                MERGE (x:{label} {{name:$name, path:$path}})
                SET x.language=$lang, x += $props
                """
                session.run(q, name=name, path=path, lang=lang, props=props)

            # --- EDGES -------------------------------------------------
            for e in edges:
                src = e.get("source")
                tgt = e.get("target")
                rel = e.get("type", "LINKS_TO")
                props = e.get("properties", {})
                if not src or not tgt:
                    continue

                q_edge = f"""
                MATCH (a {{path:$src}}), (b {{name:$tgt}})
                MERGE (a)-[r:{rel}]->(b)
                SET r += $props
                """
                session.run(q_edge, src=src, tgt=tgt, props=props)

        return jsonify({
            "status": "ok",
            "nodes_created": len(nodes),
            "edges_created": len(edges)
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@edges_bp.route("/api/graph/edges/<node_id>", methods=["GET"])
def get_edges(node_id):
    q = """
    MATCH (n {path: $node_id})-[r]-(m)
    RETURN type(r) AS type, n.path AS source, m.name AS target, properties(r) AS properties
    """
    try:
        d = get_driver()
        with d.session(database=current_app.config["NEO4J_DATABASE"]) as s:
            res = s.run(q, node_id=node_id)
            edges = [
                {
                    "type": r["type"],
                    "source": r["source"],
                    "target": r["target"],
                    "properties": r["properties"]
                }
                for r in res
            ]
            return jsonify(edges)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
