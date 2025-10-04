# ./services/analyzer-service/src/service/parsers/python_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult

try:
    from tree_sitter import Parser
except Exception:
    Parser = None

class PythonParser(BaseParser):
    LANGUAGE = "python"
    REQUIRES_TS = True

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
                if nt == "function_definition":
                    # name child
                    name = None
                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break
                    if name:
                        symbols.append(self.sym("function", name, language="python"))
                elif nt == "class_definition":
                    name = None
                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break
                    if name:
                        symbols.append(self.sym("class", name, language="python"))
                elif nt in ("import_statement", "import_from_statement"):
                    mod = text_of(n)
                    relations.append(self.rel("IMPORTS", source=path or "<memory>", target=mod.strip()))
                for c in n.children:
                    walk(c)
            walk(root)
        else:
            diags.append(self.diag("warning", "tree-sitter not available; using regex fallback"))
            # Fallback regex extraction
            for m in re.finditer(r"^\s*def\s+([A-Za-z_]\w*)\s*\(", content, re.M):
                symbols.append(self.sym("function", m.group(1), language="python"))
            for m in re.finditer(r"^\s*class\s+([A-Za-z_]\w*)\s*[:\(]", content, re.M):
                symbols.append(self.sym("class", m.group(1), language="python"))
            for m in re.finditer(r"^\s*(from\s+[.\w]+\s+import\s+[^\n]+|import\s+[^\n]+)", content, re.M):
                relations.append(self.rel("IMPORTS", source=path or "<memory>", target=m.group(1).strip()))

        return ParseResult(language="python", path=path, symbols=symbols, relations=relations, diagnostics=diags)
