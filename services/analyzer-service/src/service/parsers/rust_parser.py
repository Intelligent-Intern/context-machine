# ./services/analyzer-service/src/service/parsers/rust_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult, LanguageOntology

try:
    from tree_sitter import Parser
except Exception:
    Parser = None


class RustParser(BaseParser):
    """
    Rust language parser.

    Supports Rust-specific features:
    - Function definitions (with pub visibility)
    - Struct definitions
    - Enum definitions
    - Trait definitions
    - Use declarations (imports)
    """
    LANGUAGE = "rust"
    REQUIRES_TS = True

    # Rust-specific graph ontology
    ONTOLOGY = LanguageOntology(
        language="rust",
        node_types={
            "function",   # Function definitions
            "struct",     # Struct definitions
            "enum",       # Enum definitions
            "trait",      # Trait definitions
        },
        edge_types={
            "IMPORTS",    # Use declarations
            # Can be extended with:
            # "IMPLEMENTS",  # Trait implementation
            # "DERIVES",     # Derive macros
        },
        description="Rust language ontology with structs, enums, traits, and modules"
    )

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        symbols, relations, diags = [], [], []

        # use declarations
        for m in re.finditer(r"^\s*use\s+([A-Za-z0-9_:{}\*,\s]+);", content, re.M):
            relations.append(self.rel("IMPORTS", source=path or "<memory>", target=m.group(1).strip()))

        # fn
        for m in re.finditer(r"^\s*(pub\s+)?fn\s+([A-Za-z_]\w*)\s*\(", content, re.M):
            symbols.append(self.sym("function", m.group(2), language="rust", visibility="public" if m.group(1) else "private"))

        # struct/enum/trait
        for m in re.finditer(r"^\s*(pub\s+)?struct\s+([A-Za-z_]\w*)", content, re.M):
            symbols.append(self.sym("struct", m.group(2), language="rust", visibility="public" if m.group(1) else "private"))
        for m in re.finditer(r"^\s*(pub\s+)?enum\s+([A-Za-z_]\w*)", content, re.M):
            symbols.append(self.sym("enum", m.group(2), language="rust", visibility="public" if m.group(1) else "private"))
        for m in re.finditer(r"^\s*(pub\s+)?trait\s+([A-Za-z_]\w*)", content, re.M):
            symbols.append(self.sym("trait", m.group(2), language="rust", visibility="public" if m.group(1) else "private"))

        return ParseResult(language="rust", path=path, symbols=symbols, relations=relations, diagnostics=diags)
