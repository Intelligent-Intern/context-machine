# ./services/analyzer-service/src/service/parsers/bash_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult, LanguageOntology

try:
    from tree_sitter import Parser
except Exception:
    Parser = None


class BashParser(BaseParser):
    """
    Bash/shell script parser.

    Supports Bash-specific features:
    - Function declarations
    - Variable definitions
    - Source/dot includes
    """
    LANGUAGE = "bash"
    REQUIRES_TS = False  # Regex is usually enough for simple includes/functions

    # Bash-specific graph ontology
    ONTOLOGY = LanguageOntology(
        language="bash",
        node_types={
            "function",   # Shell function definitions
            "variable",   # Shell variable definitions
            "script",     # Shell scripts
        },
        edge_types={
            "SOURCES",    # Source/dot includes (. script.sh or source script.sh)
        },
        description="Bash/shell script ontology with function and sourcing support"
    )

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        symbols, relations, diags = [], [], []

        # Functions
        for m in re.finditer(r"^\s*([A-Za-z_]\w*)\s*\(\)\s*\{", content, re.M):
            symbols.append(self.sym("function", m.group(1), language="bash"))
        for m in re.finditer(r"^\s*function\s+([A-Za-z_]\w*)\s*\{", content, re.M):
            symbols.append(self.sym("function", m.group(1), language="bash"))

        # Sources
        for m in re.finditer(r"^\s*(?:source|\.)\s+([^\s]+)", content, re.M):
            relations.append(self.rel("SOURCES", source=path or "<memory>", target=m.group(1)))

        # Variables (simple)
        for m in re.finditer(r"^\s*([A-Za-z_]\w*)=", content, re.M):
            symbols.append(self.sym("variable", m.group(1), language="bash"))

        return ParseResult(language="bash", path=path, symbols=symbols, relations=relations, diagnostics=diags)
