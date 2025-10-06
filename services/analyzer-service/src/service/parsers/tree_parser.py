# ./services/analyzer-service/src/service/parsers/tree_parser.py

import os
import json
import uuid
import socket
import requests
from pathlib import Path
from service.parsers import build_registry

NEO4J_SERVICE_URL = os.getenv("NEO4J_SERVICE_URL", "http://context-machine-neo4j-service:3001")
API_KEY = os.getenv("API_KEY", "dev-key-123")
WS_HOST = os.getenv("WS_HOST", "context-machine-websocket-service")
WS_PORT = int(os.getenv("WS_PORT", "3010"))
EXCLUDE_DIRS = {d.strip() for d in os.getenv("ANALYZER_EXCLUDE_DIRS", "").split(",") if d.strip()}
EXCLUDE_DIRS.add(".git")

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

BULK_BATCH_SIZE = 1000


class TreeParser:
    def __init__(self, root_path: str = "/project"):
        self.root_path = Path(root_path)
        self.nodes = []
        self.edges = []
        self.node_ids = {}
        self.symbols = {}  # name -> symbol_id
        self.total_items = 0
        self.processed_items = 0
        self.last_percent = -1
        self.parsers = build_registry()

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
        return node_id

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

    def detect_language(self, filename: str):
        return SUPPORTED_EXT.get(Path(filename).suffix.lower())

    def _send_bulk_batch(self, nodes_batch, edges_batch):
        payload = {"nodes": nodes_batch, "edges": edges_batch}
        headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
        bulk_url = f"{NEO4J_SERVICE_URL}/api/graph/bulk"

        try:
            res = requests.post(bulk_url, headers=headers, data=json.dumps(payload), timeout=600)
            if res.ok:
                print(f"[BATCH SUCCESS] Sent {len(nodes_batch)} nodes, {len(edges_batch)} edges.")
            else:
                print(f"[BATCH ERROR] {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[ERROR] Failed to send batch: {e}")

    def _flush_batches(self, force=False):
        if len(self.nodes) >= BULK_BATCH_SIZE or len(self.edges) >= BULK_BATCH_SIZE or force:
            nodes_batch = self.nodes[:BULK_BATCH_SIZE]
            edges_batch = self.edges[:BULK_BATCH_SIZE]
            self._send_bulk_batch(nodes_batch, edges_batch)
            self.nodes = self.nodes[BULK_BATCH_SIZE:]
            self.edges = self.edges[BULK_BATCH_SIZE:]

    def traverse_tree(self):
        print(f"[INFO] Counting files and folders in {self.root_path} ...")
        self.total_items = self.count_items()
        print(f"[INFO] Found {self.total_items} total entries to process.")
        print(f"[INFO] Building file tree and parsing code...")

        # Phase 1: Tree + Symbol nodes
        for dirpath, dirnames, filenames in os.walk(self.root_path):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            parent = Path(dirpath)

            if str(parent) not in self.node_ids:
                self._add_node("Folder", parent.name, parent, "folder")

            for sub in dirnames:
                subpath = parent / sub
                if str(subpath) not in self.node_ids:
                    self._add_node("Folder", sub, subpath, "folder")
                self._add_edge(parent, subpath, "CONTAINS", "folder")

            for f in filenames:
                fpath = parent / f
                if str(fpath) not in self.node_ids:
                    self._add_node("File", f, fpath, "file")
                self._add_edge(parent, fpath, "CONTAINS", "file")

                lang = self.detect_language(f)
                if not lang or lang not in self.parsers:
                    continue

                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as file:
                        content = file.read()
                    parser = self.parsers[lang]
                    result = parser.parse(content, path=str(fpath))

                    if result and result.symbols:
                        for s in result.symbols:
                            sid = str(uuid.uuid4())
                            symbol_type = s.get("type", "Symbol").capitalize()
                            name = s.get("name", "")
                            self.nodes.append({
                                "id": sid,
                                "label": symbol_type,
                                "name": name,
                                "path": str(fpath),
                                "properties": s
                            })
                            file_id = self.node_ids.get(str(fpath))
                            if file_id:
                                self.edges.append({
                                    "source_id": file_id,
                                    "target_id": sid,
                                    "type": "HAS_SYMBOL",
                                    "properties": {"kind": symbol_type.lower()}
                                })
                            # map name to id
                            if name:
                                self.symbols[name] = sid

                    self._flush_batches()

                except Exception as e:
                    print(f"[WARN] Failed to parse {fpath}: {e}")

        # Phase 2: Detect symbol usage inside files
        print(f"[INFO] Scanning files for symbol usage (Phase 2)...")
        for dirpath, _, filenames in os.walk(self.root_path):
            for f in filenames:
                fpath = Path(dirpath) / f
                if str(fpath) not in self.node_ids:
                    continue

                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as file:
                        content = file.read()
                    for symbol_name, sid in self.symbols.items():
                        if symbol_name and symbol_name in content:
                            file_id = self.node_ids[str(fpath)]
                            self.edges.append({
                                "source_id": file_id,
                                "target_id": sid,
                                "type": "USES_SYMBOL",
                                "properties": {"match": symbol_name}
                            })
                    self._flush_batches()
                except Exception as e:
                    print(f"[WARN] Usage scan failed for {fpath}: {e}")

        # Final flush
        self._flush_batches(force=True)
        print(f"[INFO] Tree + AST + Symbol usage parsed and sent in batches.")
        self.send_progress(100)
