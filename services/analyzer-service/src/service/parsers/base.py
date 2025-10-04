# ./services/analyzer-service/src/service/parsers/base.py

from dataclasses import dataclass
from typing import Dict, Any, List, Optional

@dataclass
class ParseResult:
    language: str
    path: Optional[str]
    symbols: List[Dict[str, Any]]
    relations: List[Dict[str, Any]]
    diagnostics: List[Dict[str, Any]]

class BaseParser:
    LANGUAGE = "generic"
    REQUIRES_TS = False

    def __init__(self, ts_lang=None):
        self.ts_lang = ts_lang

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        raise NotImplementedError("parse() must be implemented by subclasses")

    # Helpers
    def sym(self, stype: str, name: str, **props) -> Dict[str, Any]:
        d = {"type": stype, "name": name}
        d.update(props)
        return d

    def rel(self, rtype: str, source: str, target: str, **props) -> Dict[str, Any]:
        d = {"type": rtype, "source": source, "target": target}
        d.update(props)
        return d

    def diag(self, level: str, msg: str, **props) -> Dict[str, Any]:
        d = {"level": level, "message": msg}
        d.update(props)
        return d
