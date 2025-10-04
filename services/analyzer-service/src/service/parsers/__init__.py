# ./services/analyzer-service/src/service/parsers/__init__.py

import os
from typing import Dict

from .base import BaseParser
from .python_parser import PythonParser
from .javascript_parser import JavaScriptParser
from .php_parser import PhpParser
from .bash_parser import BashParser
from .c_parser import CParser
from .rust_parser import RustParser
from .vue_parser import VueParser

try:
    from tree_sitter import Language
except Exception:
    Language = None

def _load_ts_languages() -> Dict[str, object]:
    lib_path = os.environ.get("TREE_SITTER_LIB", "")
    if not lib_path or not os.path.exists(lib_path) or not Language:
        return {}
    # language symbols in the shared library must match grammar names
    wanted = {
        "python": "python",
        "javascript": "javascript",
        "php": "php",
        "c": "c",
        "rust": "rust",
        # vue handled via JS internally; optional if lib provides 'vue'
        "vue": "vue",
    }
    langs = {}
    for k, sym in wanted.items():
        try:
            langs[k] = Language(lib_path, sym)
        except Exception:
            # ignore missing language in the .so
            pass
    return langs

_TS_LANGS = _load_ts_languages()

def build_registry() -> Dict[str, BaseParser]:
    return {
        "python": PythonParser(ts_lang=_TS_LANGS.get("python")),
        "javascript": JavaScriptParser(ts_lang=_TS_LANGS.get("javascript")),
        "nodejs":    JavaScriptParser(ts_lang=_TS_LANGS.get("javascript")),
        "php":       PhpParser(ts_lang=_TS_LANGS.get("php")),
        "bash":      BashParser(),
        "c":         CParser(ts_lang=_TS_LANGS.get("c")),
        "rust":      RustParser(ts_lang=_TS_LANGS.get("rust")),
        "vue":       VueParser(ts_lang_js=_TS_LANGS.get("javascript")),
    }
