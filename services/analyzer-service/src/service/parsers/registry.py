# ./services/analyzer-service/src/service/parsers/registry.py

from typing import Dict, Type, Optional, List
from .base import BaseParser, LanguageOntology


class ParserRegistry:
    """
    Registry for language-specific parsers.

    Allows independent registration and retrieval of parsers,
    making it easy to add new language support without modifying existing code.
    """

    def __init__(self):
        self._parsers: Dict[str, Type[BaseParser]] = {}

    def register(self, parser_class: Type[BaseParser]) -> None:
        """Register a parser class for its language."""
        language = parser_class.LANGUAGE.lower()
        self._parsers[language] = parser_class

    def get_parser(self, language: str, ts_lang=None) -> Optional[BaseParser]:
        """
        Get a parser instance for the specified language.

        Args:
            language: Language name (case-insensitive)
            ts_lang: tree-sitter language object (if required)

        Returns:
            Parser instance or None if language not supported
        """
        language = language.lower()
        parser_class = self._parsers.get(language)
        if parser_class:
            return parser_class(ts_lang=ts_lang)
        return None

    def get_ontology(self, language: str) -> Optional[LanguageOntology]:
        """Get the ontology definition for a specific language."""
        language = language.lower()
        parser_class = self._parsers.get(language)
        if parser_class:
            return parser_class.get_ontology()
        return None

    def list_languages(self) -> List[str]:
        """List all supported languages."""
        return sorted(list(self._parsers.keys()))

    def list_ontologies(self) -> Dict[str, LanguageOntology]:
        """Get all language ontologies."""
        ontologies = {}
        for language, parser_class in self._parsers.items():
            ontology = parser_class.get_ontology()
            if ontology:
                ontologies[language] = ontology
        return ontologies

    def is_supported(self, language: str) -> bool:
        """Check if a language is supported."""
        return language.lower() in self._parsers


# Global registry instance
_global_registry = ParserRegistry()


def register_parser(parser_class: Type[BaseParser]) -> None:
    """Register a parser class in the global registry."""
    _global_registry.register(parser_class)


def get_parser(language: str, ts_lang=None) -> Optional[BaseParser]:
    """Get a parser from the global registry."""
    # If no ts_lang provided, try to load from __init__._TS_LANGS
    if ts_lang is None:
        try:
            from . import _TS_LANGS
            ts_lang = _TS_LANGS.get(language.lower())
        except (ImportError, AttributeError):
            pass
    return _global_registry.get_parser(language, ts_lang)


def get_registry() -> ParserRegistry:
    """Get the global parser registry."""
    return _global_registry


# Auto-register all built-in parsers
def register_builtin_parsers():
    """Register all built-in language parsers."""
    try:
        from .python_parser import PythonParser
        register_parser(PythonParser)
    except ImportError:
        pass

    try:
        from .javascript_parser import JavaScriptParser
        register_parser(JavaScriptParser)
    except ImportError:
        pass

    try:
        from .rust_parser import RustParser
        register_parser(RustParser)
    except ImportError:
        pass

    try:
        from .c_parser import CParser
        register_parser(CParser)
    except ImportError:
        pass

    try:
        from .php_parser import PHPParser
        register_parser(PHPParser)
    except ImportError:
        pass

    try:
        from .bash_parser import BashParser
        register_parser(BashParser)
    except ImportError:
        pass

    try:
        from .vue_parser import VueParser
        register_parser(VueParser)
    except ImportError:
        pass


# Auto-register on module import
register_builtin_parsers()
