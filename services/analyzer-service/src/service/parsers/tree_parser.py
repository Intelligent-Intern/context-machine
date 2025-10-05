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
                # Use source from relation if provided, otherwise default to file path
                source = r.get("source", str(file_path))
                self.edges.append({
                    "source": source,
                    "target": r.get("target"),
                    "type": r.get("type"),
                    "properties": r
                })
        except Exception as e:
            print(f"[ERROR] Failed to parse {file_path}: {e}")

    def traverse(self):
        print(f"[INFO] Traversing project: {self.root_path}")

        # Track directories and files for CONTAINS relationships
        directories = set()
        files_by_dir = {}

        # First pass: collect directory structure and parse files
        for dirpath, dirnames, filenames in os.walk(self.root_path):
            dir_path = Path(dirpath)
            directories.add(str(dir_path))

            # Track subdirectories for CONTAINS edges
            for dirname in dirnames:
                subdir_path = dir_path / dirname
                directories.add(str(subdir_path))

            # Track files in this directory
            if str(dir_path) not in files_by_dir:
                files_by_dir[str(dir_path)] = []

            for filename in filenames:
                file_path = dir_path / filename
                files_by_dir[str(dir_path)].append(str(file_path))

                # Parse supported file types
                lang = self.detect_language(filename)
                if lang:
                    self.parse_file(file_path, lang)

        # Create Folder nodes
        for dir_path in directories:
            self.nodes.append({
                "label": "Folder",
                "name": Path(dir_path).name or "root",
                "path": dir_path,
                "properties": {
                    "type": "folder",
                    "name": Path(dir_path).name or "root",
                    "path": dir_path,
                    "id": dir_path
                }
            })

        # Create File nodes for ALL files (not just parsed ones)
        for dir_path, file_list in files_by_dir.items():
            for file_path in file_list:
                self.nodes.append({
                    "label": "File",
                    "name": Path(file_path).name,
                    "path": file_path,
                    "properties": {
                        "type": "file",
                        "name": Path(file_path).name,
                        "path": file_path,
                        "id": file_path,
                        "extension": Path(file_path).suffix
                    }
                })

        # Create CONTAINS edges: Folder -> File
        for dir_path, file_list in files_by_dir.items():
            for file_path in file_list:
                self.edges.append({
                    "source": dir_path,
                    "target": file_path,
                    "type": "CONTAINS",
                    "properties": {
                        "type": "CONTAINS"
                    }
                })

        # Create CONTAINS edges: Folder -> Folder (parent -> child)
        for dir_path in directories:
            parent_path = str(Path(dir_path).parent)
            if parent_path != dir_path and parent_path in directories:
                self.edges.append({
                    "source": parent_path,
                    "target": dir_path,
                    "type": "CONTAINS",
                    "properties": {
                        "type": "CONTAINS"
                    }
                })

        print(f"[INFO] Parsed {len(self.nodes)} nodes and {len(self.edges)} relations.")
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
