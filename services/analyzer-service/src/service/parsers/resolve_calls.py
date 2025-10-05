# ./services/analyzer-service/src/service/parsers/resolve_calls.py

import os
import json
import requests
from pathlib import Path
from service.parsers import build_registry

NEO4J_SERVICE_URL = os.getenv("NEO4J_SERVICE_URL", "http://context-machine-neo4j-service:3001")
API_KEY = os.getenv("API_KEY", "dev-key-123")

SUPPORTED_EXT = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "javascript",
    ".vue": "vue",
    ".php": "php",
    ".sh": "bash",
    ".c": "c",
    ".h": "c",
    ".rs": "rust",
}

class CallResolver:
    def __init__(self, root_path: str = "/project"):
        self.root_path = Path(root_path)
        self.parsers = build_registry()
        self.edges = []
        self.symbol_index = {}

    def load_symbols(self):
        """Hole alle Symbole aus Neo4j in ein lokales Mapping"""
        url = f"{NEO4J_SERVICE_URL}/api/graph/symbols"
        headers = {"X-API-Key": API_KEY}
        try:
            res = requests.get(url, headers=headers, timeout=60)
            if res.ok:
                data = res.json()
                for s in data.get("symbols", []):
                    self.symbol_index[s["name"]] = s["id"]
                print(f"[INFO] Loaded {len(self.symbol_index)} symbols from Neo4j.")
            else:
                print(f"[ERROR] Symbol load failed: {res.status_code}")
        except Exception as e:
            print(f"[ERROR] Failed to load symbols: {e}")

    def detect_language(self, filename: str):
        return SUPPORTED_EXT.get(Path(filename).suffix.lower())

    def resolve_calls(self):
        """Zweiter Durchlauf: Aufruf-Beziehungen erzeugen"""
        for dirpath, _, filenames in os.walk(self.root_path):
            for f in filenames:
                lang = self.detect_language(f)
                if not lang or lang not in self.parsers:
                    continue
                fpath = Path(dirpath) / f
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as src:
                        content = src.read()
                    parser = self.parsers[lang]
                    result = parser.parse(content, path=str(fpath))
                    for rel in result.relations:
                        if rel.get("type") == "CALLS":
                            src_name = rel.get("source")
                            tgt_name = rel.get("target")
                            if src_name in self.symbol_index and tgt_name in self.symbol_index:
                                self.edges.append({
                                    "source_id": self.symbol_index[src_name],
                                    "target_id": self.symbol_index[tgt_name],
                                    "type": "CALLS",
                                    "properties": rel
                                })
                except Exception as e:
                    print(f"[WARN] Failed to process {fpath}: {e}")

        if not self.edges:
            print("[WARN] No CALLS edges resolved.")
            return

        payload = {"nodes": [], "edges": self.edges}
        headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
        bulk_url = f"{NEO4J_SERVICE_URL}/api/graph/bulk"
        try:
            res = requests.post(bulk_url, headers=headers, data=json.dumps(payload), timeout=600)
            if res.ok:
                print(f"[SUCCESS] Added {len(self.edges)} CALLS edges to Neo4j.")
            else:
                print(f"[ERROR] Bulk edge insert failed: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"[ERROR] Failed to send edges: {e}")


if __name__ == "__main__":
    resolver = CallResolver("/project")
    resolver.load_symbols()
    resolver.resolve_calls()
