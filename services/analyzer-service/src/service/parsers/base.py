# ./services/analyzer-service/src/service/parsers/base.py

from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Set
from abc import ABC, abstractmethod

@dataclass
class ParseResult:
    language: str
    path: Optional[str]
    symbols: List[Dict[str, Any]]
    relations: List[Dict[str, Any]]
    diagnostics: List[Dict[str, Any]]


@dataclass
class LanguageOntology:
    """
    Defines the graph ontology (node types and edge types) for a specific language.
    Each parser can define its own ontology independently.
    """
    language: str
    node_types: Set[str]
    edge_types: Set[str]
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "language": self.language,
            "node_types": sorted(list(self.node_types)),
            "edge_types": sorted(list(self.edge_types)),
            "description": self.description
        }


class BaseParser(ABC):
    """
    Abstract base parser for language-specific code analysis.
    Each language parser should subclass this and define its own ontology.
    """
    LANGUAGE = "generic"
    REQUIRES_TS = False

    # Subclasses should override this with their language-specific ontology
    ONTOLOGY: Optional[LanguageOntology] = None

    def __init__(self, ts_lang=None):
        self.ts_lang = ts_lang

    @abstractmethod
    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        """
        Parse source code and extract symbols and relationships.
        Must be implemented by subclasses.
        """
        raise NotImplementedError("parse() must be implemented by subclasses")

    @classmethod
    def get_ontology(cls) -> Optional[LanguageOntology]:
        """Return the language-specific ontology definition."""
        return cls.ONTOLOGY

    # Helpers
    def sym(self, stype: str, name: str, **props) -> Dict[str, Any]:
        """Create a symbol node."""
        d = {"type": stype, "name": name}
        d.update(props)
        return d

    def rel(self, rtype: str, source: str, target: str, **props) -> Dict[str, Any]:
        """Create a relationship edge."""
        d = {"type": rtype, "source": source, "target": target}
        d.update(props)
        return d

    def diag(self, level: str, msg: str, **props) -> Dict[str, Any]:
        """Create a diagnostic message."""
        d = {"level": level, "message": msg}
        d.update(props)
        return d
