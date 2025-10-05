# ./services/analyzer-service/src/service/parsers/javascript_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult, LanguageOntology

try:
    from tree_sitter import Parser
except Exception:
    Parser = None


class JavaScriptParser(BaseParser):
    """
    JavaScript/TypeScript code parser.

    Supports JavaScript-specific features:
    - ES6+ module imports
    - CommonJS require()
    - Class declarations
    - Function declarations
    - Async/await (can be extended)
    - Prototypal inheritance (can be extended)
    """
    LANGUAGE = "javascript"
    REQUIRES_TS = True

    # JavaScript-specific graph ontology
    ONTOLOGY = LanguageOntology(
        language="javascript",
        node_types={
            "function",   # Function declarations
            "class",      # Class declarations
            "module",     # JavaScript modules/files
        },
        edge_types={
            # Basic relationships
            "CALLS",      # Function A calls function B
            "EXTENDS",    # Class A extends class B (inheritance)
            "IMPORTS",    # ES6 import statements
            "REQUIRES",   # CommonJS require() calls

            # Can be extended with:
            # "EXPORTS",       # Module exports
            # "ASYNC_AWAITS",  # Async/await
            # "PROMISES",      # Promise chains
            # "DECORATES",     # TypeScript decorators
            # "IMPLEMENTS",    # TypeScript interface implementation
        },
        description="JavaScript/TypeScript language ontology with ES6+ and CommonJS support"
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
                if nt in ("function_declaration",):
                    name = None
                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break
                    if name:
                        symbols.append(self.sym("function", name, language="javascript"))
                elif nt == "class_declaration":
                    name = None
                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break
                    if name:
                        symbols.append(self.sym("class", name, language="javascript"))
                elif nt == "import_declaration":
                    relations.append(self.rel("IMPORTS", source=path or "<memory>", target=text_of(n).strip()))
                elif nt == "call_expression":
                    # require('x')
                    call_txt = text_of(n)
                    m = re.search(r"require\((['\"])(.+?)\1\)", call_txt)
                    if m:
                        relations.append(self.rel("REQUIRES", source=path or "<memory>", target=m.group(2)))
                for c in n.children:
                    walk(c)
            walk(root)
        else:
            diags.append(self.diag("warning", "tree-sitter not available; using regex fallback"))
            for m in re.finditer(r"function\s+([A-Za-z_]\w*)\s*\(", content):
                symbols.append(self.sym("function", m.group(1), language="javascript"))
            for m in re.finditer(r"class\s+([A-Za-z_]\w*)\s*", content):
                symbols.append(self.sym("class", m.group(1), language="javascript"))
            for m in re.finditer(r"^\s*import\s+.+?from\s+['\"](.+?)['\"]", content, re.M):
                relations.append(self.rel("IMPORTS", source=path or "<memory>", target=m.group(1)))
            for m in re.finditer(r"require\(['\"](.+?)['\"]\)", content):
                relations.append(self.rel("REQUIRES", source=path or "<memory>", target=m.group(1)))

        return ParseResult(language="javascript", path=path, symbols=symbols, relations=relations, diagnostics=diags)
