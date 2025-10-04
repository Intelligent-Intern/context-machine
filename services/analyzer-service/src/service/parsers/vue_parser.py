# ./services/analyzer-service/src/service/parsers/vue_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult
from .javascript_parser import JavaScriptParser

class VueParser(BaseParser):
    LANGUAGE = "vue"
    REQUIRES_TS = False  # we parse script via JS parser

    def __init__(self, ts_lang_js=None):
        super().__init__(ts_lang=None)
        self.js_parser = JavaScriptParser(ts_lang=ts_lang_js)

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        symbols, relations, diags = [], [], []

        # Extract <script> content
        script_match = re.search(r"<script[^>]*>([\s\S]*?)</script>", content, re.I)
        script_code = script_match.group(1) if script_match else ""

        # Extract components from <template> by custom tags (PascalCase or kebab-case not in HTML list)
        template_match = re.search(r"<template[^>]*>([\s\S]*?)</template>", content, re.I)
        template_html = template_match.group(1) if template_match else ""
        used_tags = set(re.findall(r"<\s*([A-Za-z][A-Za-z0-9\-]*)\b", template_html))

        # JS parse for imports and exports (child components declared)
        if script_code:
            js_result = self.js_parser.parse(script_code, path=path)
            symbols.extend(js_result.symbols)
            relations.extend(js_result.relations)
            diags.extend(js_result.diagnostics)

            # detect component registration in options API: components: { Foo, 'bar-baz': Comp }
            for comp_obj in re.finditer(r"components\s*:\s*\{([\s\S]*?)\}", script_code, re.M):
                inner = comp_obj.group(1)
                for m in re.finditer(r"([A-Za-z_]\w*|'[^']+'|\"[^\"]+\")\s*:", inner):
                    raw = m.group(1).strip().strip("'\"")
                    relations.append(self.rel("CHILD_COMPONENT", source=path or "<memory>", target=raw))

        # Template-only discovered components (heuristic)
        html_std = {"div","span","a","p","img","ul","li","ol","section","header","footer","main","nav","button","input","textarea","select","option","table","thead","tbody","tr","td","th","form","label","small","strong","em"}
        for tag in used_tags:
            if tag not in html_std and not re.match(r"^(router|keep-alive|transition)", tag):
                relations.append(self.rel("CHILD_COMPONENT", source=path or "<memory>", target=tag))

        # Register this file as a 'component' symbol
        comp_name = None
        # <script> export default { name: 'X' }
        m = re.search(r"name\s*:\s*['\"]([A-Za-z0-9_\-]+)['\"]", script_code)
        if m:
            comp_name = m.group(1)
        else:
            # fallback to filename
            if path and path.endswith(".vue"):
                comp_name = path.split("/")[-1].replace(".vue", "")
        if comp_name:
            symbols.append(self.sym("component", comp_name, language="vue"))

        return ParseResult(language="vue", path=path, symbols=symbols, relations=relations, diagnostics=diags)
