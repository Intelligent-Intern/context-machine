# Language Parsers

This directory contains language-specific parsers for the Context Machine code analyzer. Each parser extracts symbols and relationships from source code to build a code knowledge graph.

## Supported Languages (7)

1. **Python** - Comprehensive support with 18 edge types (OOP, async, exceptions, decorators)
2. **JavaScript** - ES6+ and CommonJS support
3. **Rust** - Functions, structs, enums, traits, use declarations
4. **PHP** - Functions, classes, includes
5. **C** - Functions, structs, preprocessor includes
6. **Bash** - Functions, variables, source includes
7. **Vue** - SFC components with child component tracking

## Architecture

### Separation of Concerns

Each language parser:
- **Defines its own ontology** (node types and edge types)
- **Can be independently updated** without affecting other parsers
- **Inherits from BaseParser** for consistent interface
- **Registers automatically** via the registry pattern

### Core Components

1. **BaseParser** (`base.py`): Abstract base class with helper methods
2. **LanguageOntology** (`base.py`): Defines node and edge types for a language
3. **ParserRegistry** (`registry.py`): Manages parser registration and lookup
4. **Language-specific parsers**: Python, JavaScript, Rust, etc.

## Language Ontologies

### Python Ontology

**Node Types:**
- `function`: Function/method definitions
- `class`: Class definitions
- `module`: Python modules/files

**Edge Types:**
- Basic: `CALLS`, `EXTENDS`, `USES`, `IMPORTS`
- OOP: `IMPLEMENTS`, `DECORATES`, `OVERRIDES`
- Control flow: `RAISES`, `CATCHES`, `YIELDS`, `RETURNS`, `ASYNC_AWAITS`
- Object: `INSTANTIATES`, `DEFINES`, `READS`, `WRITES`, `WITH_CONTEXT`

### JavaScript Ontology

**Node Types:**
- `function`: Function declarations
- `class`: Class declarations
- `module`: JavaScript modules/files

**Edge Types:**
- `CALLS`: Function calls
- `EXTENDS`: Class inheritance
- `IMPORTS`: ES6 import statements
- `REQUIRES`: CommonJS require() calls

### Rust Ontology

**Node Types:**
- `function`: Function definitions (with pub visibility tracking)
- `struct`: Struct definitions
- `enum`: Enum definitions
- `trait`: Trait definitions

**Edge Types:**
- `IMPORTS`: Use declarations

### PHP Ontology

**Node Types:**
- `function`: Function definitions
- `class`: Class declarations

**Edge Types:**
- `INCLUDES`: Include/require/include_once/require_once statements

### C Ontology

**Node Types:**
- `function`: Function definitions
- `struct`: Struct definitions

**Edge Types:**
- `INCLUDES`: Preprocessor #include directives

### Bash Ontology

**Node Types:**
- `function`: Shell function definitions
- `variable`: Shell variable definitions
- `script`: Shell scripts

**Edge Types:**
- `SOURCES`: Source/dot includes (. script.sh or source script.sh)

### Vue Ontology

**Node Types:**
- `component`: Vue component definitions

**Edge Types:**
- `CHILD_COMPONENT`: Component uses child component
- Plus inherited JavaScript edges: `IMPORTS`, `REQUIRES`, `CALLS`, etc.

## Adding a New Language Parser

### Step 1: Create Parser File

Create a new file `<language>_parser.py`:

```python
# ./services/analyzer-service/src/service/parsers/go_parser.py

import re
from typing import Optional
from .base import BaseParser, ParseResult, LanguageOntology

try:
    from tree_sitter import Parser
except Exception:
    Parser = None


class GoParser(BaseParser):
    """
    Go language parser.

    Supports Go-specific features:
    - Struct definitions
    - Interface implementations
    - Goroutines
    - Channels
    """
    LANGUAGE = "go"
    REQUIRES_TS = True

    # Define Go-specific ontology
    ONTOLOGY = LanguageOntology(
        language="go",
        node_types={
            "function",    # Function definitions
            "struct",      # Struct definitions
            "interface",   # Interface definitions
            "package",     # Go packages
        },
        edge_types={
            "CALLS",           # Function calls
            "IMPLEMENTS",      # Interface implementation
            "EMBEDS",          # Struct embedding
            "IMPORTS",         # Import statements
            "SPAWNS_GOROUTINE", # Goroutine creation
            "SENDS_TO_CHANNEL", # Channel send
            "RECEIVES_FROM_CHANNEL", # Channel receive
        },
        description="Go language ontology with concurrency support"
    )

    def parse(self, content: str, path: Optional[str] = None) -> ParseResult:
        symbols, relations, diags = [], [], []

        if self.ts_lang and Parser:
            # Tree-sitter parsing logic
            parser = Parser()
            parser.set_language(self.ts_lang)
            tree = parser.parse(bytes(content, "utf8"))

            # Extract symbols and relationships
            # ... your parsing logic here ...

        else:
            # Fallback regex parsing
            diags.append(self.diag("warning", "tree-sitter not available"))
            # ... regex fallback ...

        return ParseResult(
            language="go",
            path=path,
            symbols=symbols,
            relations=relations,
            diagnostics=diags
        )
```

### Step 2: Register the Parser

Add import to `__init__.py`:

```python
from .go_parser import GoParser
```

The parser will auto-register via the registry system.

### Step 3: Add Tree-Sitter Support (Optional)

If using tree-sitter, add to `_load_ts_languages()`:

```python
wanted = {
    # ... existing languages ...
    "go": "go",
}
```

### Step 4: Test Your Parser

```python
from service.parsers import get_parser

# Get parser instance
parser = get_parser("go")

# Parse code
result = parser.parse(go_code, path="main.go")

# Access results
print(result.symbols)
print(result.relations)
```

## Using the Registry

### Get a Parser

```python
from service.parsers import get_parser

parser = get_parser("python")
result = parser.parse(code, path="example.py")
```

### List Available Languages

```python
from service.parsers import get_registry

registry = get_registry()
languages = registry.list_languages()
print(languages)  # ['bash', 'c', 'javascript', 'php', 'python', 'rust', 'vue'] (7 languages)
```

### Get Language Ontology

```python
from service.parsers import get_registry

registry = get_registry()
ontology = registry.get_ontology("python")
print(ontology.edge_types)  # All supported edge types for Python
```

### List All Ontologies

```python
from service.parsers import get_registry

registry = get_registry()
all_ontologies = registry.list_ontologies()

for lang, ontology in all_ontologies.items():
    print(f"{lang}: {len(ontology.edge_types)} edge types")
```

## Best Practices

1. **Define clear ontology**: Document what each edge type means
2. **Start simple**: Begin with basic CALLS/IMPORTS, add advanced features incrementally
3. **Use tree-sitter when possible**: More accurate than regex
4. **Provide regex fallback**: For environments without tree-sitter
5. **Test thoroughly**: Verify edge detection with real-world code
6. **Keep it focused**: Each parser should only handle its language

## Updating Existing Parsers

Parsers can be updated independently:

1. Modify the parser file (e.g., `python_parser.py`)
2. Update the `ONTOLOGY` definition if adding new edge types
3. Update parsing logic to extract new relationships
4. Test changes
5. No changes needed to other parsers or registry

## MCP Server Integration

The MCP server (`services/mcp-server/src/server.py`) exposes the graph schema. When adding new edge types:

1. Update your parser's `ONTOLOGY`
2. The ontology is automatically available via `get_ontology()`
3. Optionally update MCP server schema resource to aggregate all ontologies

## Future Enhancements

Potential improvements:
- **Type inference**: Track type information in edges
- **Data flow analysis**: Add edges for data dependencies
- **Control flow graphs**: Represent branches, loops
- **Cross-language edges**: Connect imports across language boundaries
- **Semantic versioning**: Track ontology versions for compatibility
