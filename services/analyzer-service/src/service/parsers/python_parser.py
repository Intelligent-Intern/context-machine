# ./services/analyzer-service/src/service/parsers/python_parser.py

import re
from typing import Optional, List, Dict, Any
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

            # Track current scope for CALLS and USES edges
            scope_stack = [path or "<memory>"]

            def text_of(n):
                return content[n.start_byte:n.end_byte]

            def get_scope_id():
                """Return current scope identifier"""
                return scope_stack[-1]

            def extract_class_bases(class_node):
                """Extract base classes from class definition"""
                bases = []
                for ch in class_node.children:
                    if ch.type == "argument_list":
                        # Parse base classes
                        for base_child in ch.children:
                            if base_child.type == "identifier":
                                bases.append(text_of(base_child))
                            elif base_child.type == "attribute":
                                bases.append(text_of(base_child))
                return bases

            def walk(n, parent_type=None):
                nt = n.type

                if nt == "function_definition":
                    # Extract function name
                    name = None
                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break
                    if name:
                        func_id = f"{get_scope_id()}::{name}"
                        symbols.append(self.sym("function", name, language="python", id=func_id, file=path))
                        # Push function scope
                        scope_stack.append(func_id)
                        # Continue walking inside function
                        for c in n.children:
                            walk(c, "function")
                        scope_stack.pop()
                        return  # Already walked children

                elif nt == "class_definition":
                    # Extract class name
                    name = None
                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break
                    if name:
                        class_id = f"{path}::{name}"
                        symbols.append(self.sym("class", name, language="python", id=class_id, file=path))

                        # Extract base classes for EXTENDS edges
                        bases = extract_class_bases(n)
                        for base in bases:
                            relations.append(self.rel("EXTENDS", source=class_id, target=base))

                        # Push class scope
                        scope_stack.append(class_id)
                        # Continue walking inside class
                        for c in n.children:
                            walk(c, "class")
                        scope_stack.pop()
                        return  # Already walked children

                elif nt in ("import_statement", "import_from_statement"):
                    mod = text_of(n)
                    relations.append(self.rel("IMPORTS", source=path or "<memory>", target=mod.strip()))

                elif nt == "call":
                    # Function call detected
                    func_name = None
                    for ch in n.children:
                        if ch.type == "identifier":
                            func_name = text_of(ch)
                            break
                        elif ch.type == "attribute":
                            # Handle method calls like obj.method()
                            func_name = text_of(ch)
                            break

                    if func_name and len(scope_stack) > 1:
                        # Record CALLS edge from current scope to called function
                        relations.append(self.rel("CALLS", source=get_scope_id(), target=func_name))

                elif nt == "identifier" and parent_type in ("function", "class"):
                    # Variable usage (simplified - excludes definitions)
                    var_name = text_of(n)
                    # Only track if we're in a function/class scope and it's not a keyword
                    if len(scope_stack) > 1 and var_name not in ("self", "cls", "def", "class", "return", "if", "else", "for", "while"):
                        relations.append(self.rel("USES", source=get_scope_id(), target=var_name))

                # Continue walking children
                for c in n.children:
                    walk(c, parent_type)

            walk(root)
        else:
            diags.append(self.diag("warning", "tree-sitter not available; using regex fallback"))
            # Fallback regex extraction (basic, without new features)
            for m in re.finditer(r"^\s*def\s+([A-Za-z_]\w*)\s*\(", content, re.M):
                symbols.append(self.sym("function", m.group(1), language="python"))
            for m in re.finditer(r"^\s*class\s+([A-Za-z_]\w*)\s*[:\(]", content, re.M):
                symbols.append(self.sym("class", m.group(1), language="python"))
            for m in re.finditer(r"^\s*(from\s+[.\w]+\s+import\s+[^\n]+|import\s+[^\n]+)", content, re.M):
                relations.append(self.rel("IMPORTS", source=path or "<memory>", target=m.group(1).strip()))

        return ParseResult(language="python", path=path, symbols=symbols, relations=relations, diagnostics=diags)
