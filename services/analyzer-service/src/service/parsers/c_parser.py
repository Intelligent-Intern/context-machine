# ./services/analyzer-service/src/service/parsers/c_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult, LanguageOntology

try:
    from tree_sitter import Parser
except Exception:
    Parser = None


class CParser(BaseParser):
    """
    C language parser.

    Supports C-specific features:
    - Function definitions
    - Struct definitions
    - Preprocessor includes
    """
    LANGUAGE = "c"
    REQUIRES_TS = True

    # C-specific graph ontology
    ONTOLOGY = LanguageOntology(
        language="c",
        node_types={
            "function",   # Function definitions
            "struct",     # Struct definitions
        },
        edge_types={
            "INCLUDES",   # Preprocessor #include directives
        },
        description="C language ontology with structs and preprocessor includes"
    )

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        symbols, relations, diags = [], [], []

        # Includes via preprocessor
        for m in re.finditer(r"^\s*#\s*include\s+[<\"](.+?)[>\"]", content, re.M):
            relations.append(self.rel("INCLUDES", source=path or "<memory>", target=m.group(1)))

        # Functions (very naive regex)
        for m in re.finditer(r"^\s*[A-Za-z_][\w\s\*\(\),]*\s+([A-Za-z_]\w*)\s*\([^\)]*\)\s*\{", content, re.M):
            symbols.append(self.sym("function", m.group(1), language="c"))

        # Typedef/struct (simple)
        for m in re.finditer(r"^\s*struct\s+([A-Za-z_]\w*)\s*\{", content, re.M):
            symbols.append(self.sym("struct", m.group(1), language="c"))

        return ParseResult(language="c", path=path, symbols=symbols, relations=relations, diagnostics=diags)
