# ./services/neo4j-service/src/service/bulk.py

import uuid
from flask import Blueprint, request, jsonify, current_app

bulk_bp = Blueprint("bulk", __name__)
openapi_spec_bulk = {"paths": {}}


@bulk_bp.route("/api/graph/bulk", methods=["POST"])
def bulk_insert():
    data = request.get_json(force=True)
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    driver = current_app.config["NEO4J_DRIVER"]
    database = current_app.config["NEO4J_DATABASE"]

    created_nodes = 0
    created_edges = 0

    try:
        with driver.session(database=database) as session:
            # Nodes anlegen
            for n in nodes:
                label = n.get("label", "Entity")
                node_id = n.get("id") or str(uuid.uuid4())
                name = n.get("name", "")
                path = n.get("path", "")
                props = n.get("properties", {})

                q_node = f"""
                MERGE (x:{label} {{id:$id}})
                SET x.name=$name, x.path=$path, x += $props
                """
                session.run(q_node, id=node_id, name=name, path=path, props=props)
                created_nodes += 1

            # Edges anlegen
            for e in edges:
                src = e.get("source_id") or e.get("source")
                tgt = e.get("target_id") or e.get("target")
                rel = e.get("type", "RELATED_TO")
                props = e.get("properties", {})

                if not src or not tgt:
                    continue

                q_edge = f"""
                MATCH (a {{id:$src}}), (b {{id:$tgt}})
                MERGE (a)-[r:{rel}]->(b)
                SET r += $props
                """
                session.run(q_edge, src=src, tgt=tgt, props=props)
                created_edges += 1

        return jsonify({
            "message": "Import successful",
            "nodes_created": created_nodes,
            "edges_created": created_edges
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
