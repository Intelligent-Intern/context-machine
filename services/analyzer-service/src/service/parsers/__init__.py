# ./services/analyzer-service/src/service/parsers/__init__.py

import os
from typing import Dict

# Export core classes and types
from .base import BaseParser, ParseResult, LanguageOntology
from .registry import ParserRegistry, get_parser, get_registry, register_parser

# Import language parsers (auto-registers them)
from .python_parser import PythonParser
from .javascript_parser import JavaScriptParser
from .php_parser import PHPParser
from .bash_parser import BashParser
from .c_parser import CParser
from .rust_parser import RustParser
from .vue_parser import VueParser

try:
    from tree_sitter import Language
except Exception:
    Language = None


def _load_ts_languages() -> Dict[str, object]:
    """Load tree-sitter language parsers from shared library."""
    langs = {}

    # Load from shared library (.so file)
    lib_path = os.environ.get("TREE_SITTER_LIB", "")
    if lib_path and os.path.exists(lib_path) and Language:
        # language symbols in the shared library must match grammar names
        wanted = {
            "python": "python",
            "javascript": "javascript",
            "php": "php",
            "c": "c",
            "rust": "rust",
            "vue": "vue",
        }
        for k, sym in wanted.items():
            try:
                langs[k] = Language(lib_path, sym)
            except Exception as e:
                # ignore missing language in the .so
                pass

    return langs


_TS_LANGS = _load_ts_languages()


def build_registry() -> Dict[str, BaseParser]:
    """
    Build parser registry (backward compatibility).

    DEPRECATED: Use get_parser() or get_registry() instead.
    """
    registry = get_registry()
    parsers = {}

    for language in registry.list_languages():
        ts_lang = _TS_LANGS.get(language)
        parser = registry.get_parser(language, ts_lang=ts_lang)
        if parser:
            parsers[language] = parser

    # Add aliases
    if "javascript" in parsers:
        parsers["nodejs"] = JavaScriptParser(ts_lang=_TS_LANGS.get("javascript"))

    return parsers


__all__ = [
    # Core classes
    "BaseParser",
    "ParseResult",
    "LanguageOntology",

    # Registry
    "ParserRegistry",
    "get_parser",
    "get_registry",
    "register_parser",

    # Language parsers
    "PythonParser",
    "JavaScriptParser",
    "PHPParser",
    "BashParser",
    "CParser",
    "RustParser",
    "VueParser",

    # Backward compatibility
    "build_registry",
]
