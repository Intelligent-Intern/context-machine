# ./services/analyzer-service/src/service/parsers/php_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult, LanguageOntology

try:
    from tree_sitter import Parser
except Exception:
    Parser = None


class PHPParser(BaseParser):
    """
    PHP language parser.

    Supports PHP-specific features:
    - Function definitions
    - Class declarations
    - Include/require statements
    """
    LANGUAGE = "php"
    REQUIRES_TS = True

    # PHP-specific graph ontology
    ONTOLOGY = LanguageOntology(
        language="php",
        node_types={
            "function",   # Function definitions
            "class",      # Class declarations
        },
        edge_types={
            "INCLUDES",   # Include/require/include_once/require_once statements
        },
        description="PHP language ontology with OOP and include support"
    )

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        symbols, relations, diags = [], [], []

        if self.ts_lang and Parser:
            parser = Parser()
            parser.set_language(self.ts_lang)
            tree = parser.parse(bytes(content, "utf8"))
            root = tree.root_node
            def text_of(n):
                return content[n.start_byte:n.end_byte]

            def walk(n):
                nt = n.type
                if nt in ("function_definition",):
                    # name child: name
                    name = None
                    for ch in n.children:
                        if ch.type in ("name", "identifier"):
                            name = text_of(ch)
                            break
                    if name:
                        symbols.append(self.sym("function", name, language="php"))
                elif nt in ("class_declaration", "class_declaration_statement"):
                    name = None
                    for ch in n.children:
                        if ch.type in ("name", "identifier"):
                            name = text_of(ch)
                            break
                    if name:
                        symbols.append(self.sym("class", name, language="php"))
                # includes / requires
                elif nt in ("include_expression", "require_expression", "include_once_expression", "require_once_expression"):
                    relations.append(self.rel("INCLUDES", source=path or "<memory>", target=text_of(n).strip()))
                for c in n.children:
                    walk(c)
            walk(root)
        else:
            diags.append(self.diag("warning", "tree-sitter not available; using regex fallback"))
            for m in re.finditer(r"function\s+([A-Za-z_]\w*)\s*\(", content):
                symbols.append(self.sym("function", m.group(1), language="php"))
            for m in re.finditer(r"class\s+([A-Za-z_]\w*)\b", content):
                symbols.append(self.sym("class", m.group(1), language="php"))
            for m in re.finditer(r"\b(include|include_once|require|require_once)\s*\(?\s*['\"](.+?)['\"]\s*\)?", content):
                relations.append(self.rel("INCLUDES", source=path or "<memory>", target=m.group(2)))

        return ParseResult(language="php", path=path, symbols=symbols, relations=relations, diagnostics=diags)
