# ./services/analyzer-service/src/service/parsers/python_parser.py

import re
from typing import Optional, List, Dict, Any
from .base import BaseParser, ParseResult, LanguageOntology

try:
    from tree_sitter import Parser
except Exception:
    Parser = None


class PythonParser(BaseParser):
    """
    Python-specific code parser with comprehensive ontology support.

    Supports Python-specific features:
    - Protocol/ABC implementations
    - Decorators
    - Method overriding
    - Exception handling (raise/catch)
    - Generators (yield)
    - Async/await
    - Context managers (with)
    - Attribute access (read/write)
    """
    LANGUAGE = "python"
    REQUIRES_TS = True

    # Python-specific graph ontology
    ONTOLOGY = LanguageOntology(
        language="python",
        node_types={
            "function",   # Function/method definitions
            "class",      # Class definitions
            "module",     # Python modules/files
        },
        edge_types={
            # Basic relationships
            "CALLS",        # Function A calls function B
            "EXTENDS",      # Class A extends class B (inheritance)
            "USES",         # Function uses variable
            "IMPORTS",      # File imports module

            # Python-specific OOP
            "IMPLEMENTS",   # Class implements Protocol/ABC
            "DECORATES",    # Decorator applied to function/class
            "OVERRIDES",    # Method overrides parent class method

            # Control flow & exceptions
            "RAISES",       # Function raises exception
            "CATCHES",      # Function catches exception
            "YIELDS",       # Generator yields value
            "RETURNS",      # Function returns value/type
            "ASYNC_AWAITS", # Async function awaits coroutine

            # Object relationships
            "INSTANTIATES", # Function creates instance of class
            "DEFINES",      # Function defines variable/constant
            "READS",        # Function reads attribute/property
            "WRITES",       # Function writes to attribute/property
            "WITH_CONTEXT", # Function uses context manager (with statement)
        },
        description="Python language ontology with OOP, async, and exception handling support"
    )

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        symbols, relations, diags = [], [], []

        if self.ts_lang and Parser:
            parser = Parser()
            parser.set_language(self.ts_lang)
            tree = parser.parse(bytes(content, "utf8"))
            root = tree.root_node

            # Track current scope for CALLS and USES edges
            scope_stack = [path or "<memory>"]
            # Track class methods for OVERRIDES detection
            class_methods = {}  # class_id -> set of method names
            # Track current class being processed
            current_class = None

            def text_of(n):
                return content[n.start_byte:n.end_byte]

            def get_scope_id():
                """Return current scope identifier"""
                return scope_stack[-1]

            def extract_class_bases(class_node):
                """Extract base classes from class definition"""
                bases = []
                protocols_or_abc = []
                for ch in class_node.children:
                    if ch.type == "argument_list":
                        # Parse base classes
                        for base_child in ch.children:
                            base_name = None
                            if base_child.type == "identifier":
                                base_name = text_of(base_child)
                            elif base_child.type == "attribute":
                                base_name = text_of(base_child)

                            if base_name:
                                bases.append(base_name)
                                # Check if it's a Protocol or ABC
                                if "Protocol" in base_name or "ABC" in base_name or base_name in ("Protocol", "ABC"):
                                    protocols_or_abc.append(base_name)
                return bases, protocols_or_abc

            def walk(n, parent_type=None):
                nonlocal current_class
                nt = n.type

                if nt == "function_definition":
                    # Extract function name and decorators
                    name = None
                    decorators = []
                    is_async = False

                    # Check for async
                    if n.prev_sibling and n.prev_sibling.type == "async":
                        is_async = True

                    # Check for decorators
                    prev = n.prev_sibling
                    while prev:
                        if prev.type == "decorator":
                            dec_name = text_of(prev).strip().lstrip('@')
                            decorators.append(dec_name)
                        prev = prev.prev_sibling

                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break

                    if name:
                        func_id = f"{get_scope_id()}::{name}"
                        symbols.append(self.sym("function", name, language="python", id=func_id, file=path, is_async=is_async))

                        # Add DECORATES edges
                        for decorator in decorators:
                            relations.append(self.rel("DECORATES", source=decorator, target=func_id))

                        # If method inside class, check for OVERRIDES
                        if current_class and current_class in class_methods:
                            if name in class_methods[current_class]:
                                relations.append(self.rel("OVERRIDES", source=func_id, target=f"{current_class}::{name}"))

                        # Push function scope
                        scope_stack.append(func_id)
                        # Continue walking inside function
                        for c in n.children:
                            walk(c, "function")
                        scope_stack.pop()
                        return  # Already walked children

                elif nt == "class_definition":
                    # Extract class name and decorators
                    name = None
                    decorators = []

                    # Check for decorators
                    prev = n.prev_sibling
                    while prev:
                        if prev.type == "decorator":
                            dec_name = text_of(prev).strip().lstrip('@')
                            decorators.append(dec_name)
                        prev = prev.prev_sibling

                    for ch in n.children:
                        if ch.type == "identifier":
                            name = text_of(ch)
                            break

                    if name:
                        class_id = f"{path}::{name}"
                        symbols.append(self.sym("class", name, language="python", id=class_id, file=path))

                        # Add DECORATES edges
                        for decorator in decorators:
                            relations.append(self.rel("DECORATES", source=decorator, target=class_id))

                        # Extract base classes for EXTENDS and IMPLEMENTS edges
                        bases, protocols_or_abc = extract_class_bases(n)
                        for base in bases:
                            # If base is Protocol or ABC, use IMPLEMENTS
                            if base in protocols_or_abc:
                                relations.append(self.rel("IMPLEMENTS", source=class_id, target=base))
                            else:
                                relations.append(self.rel("EXTENDS", source=class_id, target=base))

                        # Store methods for OVERRIDES detection
                        prev_class = current_class
                        current_class = class_id
                        if class_id not in class_methods:
                            class_methods[class_id] = set()

                        # Push class scope
                        scope_stack.append(class_id)
                        # Continue walking inside class
                        for c in n.children:
                            walk(c, "class")
                        scope_stack.pop()
                        current_class = prev_class
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
                        # Check if it's a class instantiation (starts with uppercase)
                        if func_name and func_name[0].isupper():
                            relations.append(self.rel("INSTANTIATES", source=get_scope_id(), target=func_name))
                        else:
                            # Record CALLS edge from current scope to called function
                            relations.append(self.rel("CALLS", source=get_scope_id(), target=func_name))

                elif nt == "raise_statement":
                    # Exception raising
                    exception_type = None
                    for ch in n.children:
                        if ch.type in ("identifier", "attribute", "call"):
                            exception_type = text_of(ch)
                            break
                    if exception_type and len(scope_stack) > 1:
                        relations.append(self.rel("RAISES", source=get_scope_id(), target=exception_type))

                elif nt == "except_clause":
                    # Exception handling
                    exception_type = None
                    for ch in n.children:
                        if ch.type in ("identifier", "attribute"):
                            exception_type = text_of(ch)
                            break
                    if exception_type and len(scope_stack) > 1:
                        relations.append(self.rel("CATCHES", source=get_scope_id(), target=exception_type))

                elif nt == "yield":
                    # Generator yield
                    if len(scope_stack) > 1:
                        yielded_value = None
                        for ch in n.children:
                            if ch.type in ("identifier", "attribute", "call", "string"):
                                yielded_value = text_of(ch)
                                break
                        relations.append(self.rel("YIELDS", source=get_scope_id(), target=yielded_value or "value"))

                elif nt == "return_statement":
                    # Return statement
                    if len(scope_stack) > 1:
                        returned_value = None
                        for ch in n.children:
                            if ch.type in ("identifier", "attribute", "call", "string", "integer", "boolean"):
                                returned_value = text_of(ch)
                                break
                        if returned_value:
                            relations.append(self.rel("RETURNS", source=get_scope_id(), target=returned_value))

                elif nt == "await":
                    # Async await
                    awaited_value = None
                    for ch in n.children:
                        if ch.type in ("identifier", "attribute", "call"):
                            awaited_value = text_of(ch)
                            break
                    if awaited_value and len(scope_stack) > 1:
                        relations.append(self.rel("ASYNC_AWAITS", source=get_scope_id(), target=awaited_value))

                elif nt == "with_statement":
                    # Context manager
                    context_expr = None
                    for ch in n.children:
                        if ch.type == "with_clause":
                            for item in ch.children:
                                if item.type == "with_item":
                                    for expr in item.children:
                                        if expr.type in ("identifier", "attribute", "call"):
                                            context_expr = text_of(expr)
                                            break
                                    if context_expr:
                                        break
                        if context_expr:
                            break
                    if context_expr and len(scope_stack) > 1:
                        relations.append(self.rel("WITH_CONTEXT", source=get_scope_id(), target=context_expr))

                elif nt == "assignment":
                    # Variable definition (assignment)
                    var_name = None
                    value = None
                    for ch in n.children:
                        if ch.type in ("identifier", "pattern_list"):
                            var_name = text_of(ch)
                        elif ch.type in ("identifier", "attribute", "call", "string", "integer"):
                            value = text_of(ch)
                    if var_name and len(scope_stack) > 1:
                        relations.append(self.rel("DEFINES", source=get_scope_id(), target=var_name))

                elif nt == "attribute":
                    # Attribute access (READS or WRITES)
                    attr_name = text_of(n)
                    if len(scope_stack) > 1:
                        # Check if it's in an assignment context (WRITES) or read context (READS)
                        parent = n.parent
                        is_write = False
                        if parent and parent.type == "assignment":
                            # Check if this attribute is on the left side
                            for ch in parent.children:
                                if ch == n:
                                    is_write = True
                                    break
                                elif ch.type == "=":
                                    break

                        if is_write:
                            relations.append(self.rel("WRITES", source=get_scope_id(), target=attr_name))
                        else:
                            relations.append(self.rel("READS", source=get_scope_id(), target=attr_name))

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
