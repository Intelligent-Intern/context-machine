# ./services/analyzer-service/src/service/parsers/tree_parser.py

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

class TreeParser:
    def __init__(self, root_path: str = "/project"):
        self.root_path = Path(root_path)
        self.parsers = build_registry()
        self.nodes = []
        self.edges = []

    def detect_language(self, filename: str):
        ext = Path(filename).suffix.lower()
        return SUPPORTED_EXT.get(ext)

    def parse_file(self, file_path: Path, language: str):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            parser = self.parsers.get(language)
            if not parser:
                return
            result = parser.parse(content, path=str(file_path))
            for s in result.symbols:
                s["file"] = str(file_path)
                self.nodes.append({
                    "label": s.get("type"),
                    "name": s.get("name"),
                    "language": s.get("language"),
                    "path": str(file_path),
                    "properties": s
                })
            for r in result.relations:
                self.edges.append({
                    "source": str(file_path),
                    "target": r.get("target"),
                    "type": r.get("type"),
                    "properties": r
                })
        except Exception as e:
            print(f"[ERROR] Failed to parse {file_path}: {e}")

    def traverse(self):
        print(f"[INFO] Traversing project: {self.root_path}")
        for dirpath, _, filenames in os.walk(self.root_path):
            for filename in filenames:
                lang = self.detect_language(filename)
                if not lang:
                    continue
                file_path = Path(dirpath) / filename
                self.parse_file(file_path, lang)
        print(f"[INFO] Parsed {len(self.nodes)} symbols and {len(self.edges)} relations.")
        self.send_bulk()

    def send_bulk(self):
        if not self.nodes and not self.edges:
            print("[WARN] No data to send to Neo4j service.")
            return
        bulk_url = f"{NEO4J_SERVICE_URL}/api/graph/bulk"
        payload = {
            "nodes": self.nodes,
            "edges": self.edges
        }
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        }
        try:
            print(f"[INFO] Sending bulk data to {bulk_url} ...")
            res = requests.post(bulk_url, headers=headers, data=json.dumps(payload), timeout=300)
            if res.status_code == 201 or res.status_code == 200:
                print("[SUCCESS] Bulk data successfully imported into Neo4j.")
            else:
                print(f"[ERROR] Bulk insert failed: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"[ERROR] Failed to send bulk data: {e}")


if __name__ == "__main__":
    analyzer = TreeParser("/project")
    analyzer.traverse()
