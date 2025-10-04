# ./services/analyzer-service/src/service/analyzer.py

from typing import Dict, Any, List
from flask import Blueprint, request, jsonify
from .parsers import build_registry
from .parsers.base import ParseResult

analyzer_bp = Blueprint("analyzer", __name__)
_registry = build_registry()

openapi_spec_analyzer = {
    "paths": {
        "/api/analyzer/languages": {
            "get": {
                "summary": "List supported languages",
                "tags": ["Analyzer"],
                "security": [{"ApiKeyAuth": []}],
                "responses": { "200": { "description": "OK" } }
            }
        },
        "/api/analyzer/parse": {
            "post": {
                "summary": "Parse a single code file content",
                "tags": ["Analyzer"],
                "security": [{"ApiKeyAuth": []}],
                "parameters": [{
                    "name": "body",
                    "in": "body",
                    "required": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "language": { "type": "string", "example": "python" },
                            "content": { "type": "string" },
                            "path": { "type": "string" }
                        },
                        "required": ["language", "content"]
                    }
                }],
                "responses": {
                    "200": { "description": "Parsed result" },
                    "400": { "description": "Invalid request" }
                }
            }
        },
        "/api/analyzer/parse-batch": {
            "post": {
                "summary": "Parse multiple files in one request",
                "tags": ["Analyzer"],
                "security": [{"ApiKeyAuth": []}],
                "parameters": [{
                    "name": "body",
                    "in": "body",
                    "required": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "language": { "type": "string" },
                                        "content": { "type": "string" },
                                        "path": { "type": "string" }
                                    },
                                    "required": ["language", "content"]
                                }
                            }
                        },
                        "required": ["files"]
                    }
                }],
                "responses": {
                    "200": { "description": "Parsed batch results" },
                    "400": { "description": "Invalid request" }
                }
            }
        }
    }
}

def _to_json(result: ParseResult) -> Dict[str, Any]:
    return {
        "language": result.language,
        "path": result.path,
        "symbols": result.symbols,
        "relations": result.relations,
        "diagnostics": result.diagnostics
    }

@analyzer_bp.route("/api/analyzer/languages", methods=["GET"])
def list_languages():
    return jsonify({"languages": sorted(_registry.keys())})

@analyzer_bp.route("/api/analyzer/parse", methods=["POST"])
def parse_single():
    data = request.get_json(force=True)
    lang = data.get("language")
    content = data.get("content")
    path = data.get("path")
    if not lang or not content:
        return jsonify({"error": "language and content are required"}), 400
    parser = _registry.get(lang.lower())
    if not parser:
        return jsonify({"error": f"unsupported language: {lang}"}), 400

    try:
        res = parser.parse(content, path=path)
        return jsonify(_to_json(res))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analyzer_bp.route("/api/analyzer/parse-batch", methods=["POST"])
def parse_batch():
    data = request.get_json(force=True)
    files = data.get("files", [])
    if not isinstance(files, list) or not files:
        return jsonify({"error": "files must be a non-empty array"}), 400

    out: List[Dict[str, Any]] = []
    for f in files:
        lang = (f.get("language") or "").lower()
        content = f.get("content")
        path = f.get("path")
        parser = _registry.get(lang)
        if not parser or content is None:
            out.append({"error": f"skip: unsupported language or missing content", "path": path})
            continue
        try:
            res = parser.parse(content, path=path)
            out.append(_to_json(res))
        except Exception as e:
            out.append({"error": str(e), "path": path})

    return jsonify({"results": out})
