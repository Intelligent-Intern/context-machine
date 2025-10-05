# ./services/analyzer-service/src/service/parsers/tree_parser.py

import os
import json
import uuid
import socket
import requests
from pathlib import Path

NEO4J_SERVICE_URL = os.getenv("NEO4J_SERVICE_URL", "http://context-machine-neo4j-service:3001")
API_KEY = os.getenv("API_KEY", "dev-key-123")
WS_HOST = os.getenv("WS_HOST", "context-machine-websocket-service")
WS_PORT = int(os.getenv("WS_PORT", "3010"))
EXCLUDE_DIRS = {d.strip() for d in os.getenv("ANALYZER_EXCLUDE_DIRS", "").split(",") if d.strip()}
EXCLUDE_DIRS.add(".git")


class TreeParser:
    def __init__(self, root_path: str = "/project"):
        self.root_path = Path(root_path)
        self.nodes = []
        self.edges = []
        self.node_ids = {}
        self.total_items = 0
        self.processed_items = 0
        self.last_percent = -1

    def send_progress(self, percent: int):
        try:
            message = json.dumps({"api_key": API_KEY, "percent": percent}) + "\n"
            with socket.create_connection((WS_HOST, WS_PORT + 1), timeout=2) as sock:
                sock.sendall(message.encode("utf-8"))
        except Exception:
            pass

    def count_items(self) -> int:
        count = 0
        dirs = [self.root_path]
        while dirs:
            current = dirs.pop()
            try:
                for entry in os.scandir(current):
                    name = os.path.basename(entry.path)
                    if entry.is_dir(follow_symlinks=False):
                        if name not in EXCLUDE_DIRS:
                            count += 1
                            dirs.append(entry.path)
                    else:
                        count += 1
            except (PermissionError, FileNotFoundError):
                continue
        return count

    def update_progress(self):
        if self.total_items == 0:
            return
        percent = int((self.processed_items / self.total_items) * 100)
        if percent > self.last_percent:
            self.last_percent = percent
            self.send_progress(percent)

    def _add_node(self, label: str, name: str, path: Path, ntype: str):
        node_id = str(uuid.uuid4())
        self.node_ids[str(path)] = node_id
        self.nodes.append({
            "id": node_id,
            "label": label,
            "name": name,
            "path": str(path),
            "properties": {"type": ntype}
        })
        self.processed_items += 1
        self.update_progress()

    def _add_edge(self, source_path: Path, target_path: Path, rel_type: str, kind: str):
        src_id = self.node_ids.get(str(source_path))
        tgt_id = self.node_ids.get(str(target_path))
        if not src_id or not tgt_id:
            return
        self.edges.append({
            "source_id": src_id,
            "target_id": tgt_id,
            "type": rel_type,
            "properties": {"kind": kind}
        })

    def traverse_tree(self):
        print(f"[INFO] Counting files and folders in {self.root_path} ...")
        self.total_items = self.count_items()
        print(f"[INFO] Found {self.total_items} total entries to process.")
        print(f"[INFO] Building file tree for: {self.root_path}")

        for dirpath, dirnames, filenames in os.walk(self.root_path):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            parent = Path(dirpath)

            # Folder node
            if str(parent) not in self.node_ids:
                self._add_node("Folder", parent.name, parent, "folder")

            # Subfolders -> connect with CONTAINS edges
            for sub in dirnames:
                subpath = parent / sub
                if str(subpath) not in self.node_ids:
                    self._add_node("Folder", sub, subpath, "folder")
                self._add_edge(parent, subpath, "CONTAINS", "folder")

            # Files -> connect to parent
            for f in filenames:
                fpath = parent / f
                if str(fpath) not in self.node_ids:
                    self._add_node("File", f, fpath, "file")
                self._add_edge(parent, fpath, "CONTAINS", "file")

        print(f"[INFO] Tree collected: {len(self.nodes)} nodes, {len(self.edges)} edges")
        self.send_progress(100)
        self.send_bulk()

    def send_bulk(self):
        if not self.nodes and not self.edges:
            print("[WARN] No tree data to send to Neo4j service.")
            return

        payload = {"nodes": self.nodes, "edges": self.edges}
        headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
        bulk_url = f"{NEO4J_SERVICE_URL}/api/graph/bulk"

        try:
            print(f"[INFO] Sending tree structure to {bulk_url} ({len(self.nodes)} nodes, {len(self.edges)} edges)")
            res = requests.post(bulk_url, headers=headers, data=json.dumps(payload), timeout=600)
            if res.ok:
                print("[SUCCESS] Project tree imported into Neo4j.")
            else:
                print(f"[ERROR] Bulk insert failed: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"[ERROR] Failed to send bulk data: {e}")


if __name__ == "__main__":
    TreeParser("/project").traverse_tree()
