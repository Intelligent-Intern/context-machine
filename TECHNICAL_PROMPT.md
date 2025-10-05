# Technical Prompt for Claude - Context Machine Usage

This document provides guidance for Claude (or any LLM) on how to effectively use the Context Machine MCP tools for code understanding and analysis.

---

## System Overview

Context Machine exposes a **code knowledge graph** via MCP. Unlike RAG (text similarity), this graph contains **explicit relationships** between code entities:

- **Nodes**: Functions, classes, files, folders
- **Edges**: CALLS, EXTENDS, IMPORTS, USES, CONTAINS

This enables **structural queries** that RAG cannot handle.

---

## When to Use Graph vs. Direct Code Reading

### Use Graph Tools When:
- ✅ Finding relationships: "What calls X?", "What does Y import?"
- ✅ Structural queries: "Show class hierarchy", "Find dependency chain"
- ✅ Cross-file analysis: "Where is this variable used?"
- ✅ High-level navigation: "What functions exist in module X?"
- ✅ Impact analysis: "What would break if I change this function?"

### Read Code Directly When:
- ✅ Examining implementation details
- ✅ Understanding logic flow within a function
- ✅ Checking exact syntax or formatting
- ✅ After using graph to locate the right files

**Strategy**: Use graph to **navigate**, then read code to **understand**.

---

## Tool Usage Patterns

### Pattern 1: Finding Entry Points
**User asks:** "Where should I start understanding this codebase?"

**Approach:**
1. `get_file_structure` with path="/project" to see high-level organization
2. `find_function` with name="main" to find entry points
3. `get_function_calls` to see what the entry point does
4. Read the actual code for the discovered files

### Pattern 2: Understanding a Feature
**User asks:** "How does the analyzer work?"

**Approach:**
1. `find_function` or `find_class` with name="*analyzer*"
2. `get_symbol_context` for the main analyzer class/function
3. `get_function_calls` to see what it invokes
4. `get_file_dependencies` to see external dependencies
5. Read key implementation files

### Pattern 3: Impact Analysis
**User asks:** "What would break if I change function X?"

**Approach:**
1. `get_function_callers` to find who calls X
2. For each caller, `get_symbol_context` to understand usage
3. `query_graph` for transitive callers (multi-hop)
4. Assess risk based on call graph depth

### Pattern 4: Debugging
**User asks:** "Where is variable Y used?"

**Approach:**
1. `find_variable_usage` with variable_name="Y"
2. For each usage location, `get_symbol_context` for the containing function
3. Read the actual code to understand how it's used

### Pattern 5: Architectural Understanding
**User asks:** "What's the class hierarchy?"

**Approach:**
1. `find_class` to discover classes
2. `get_class_hierarchy` for each base class
3. Visualize inheritance tree
4. Read base and derived classes for patterns

---

## Tool Reference

### `query_graph` - Most Powerful
**Use for:** Complex, custom queries not covered by other tools

**Cypher patterns:**

```cypher
-- Find all functions in a file
MATCH (f:function {file: $file_path})
RETURN f.name, f.id

-- Find call chains (multi-hop)
MATCH path = (start:function {name: $func_name})-[:CALLS*1..3]->(end)
RETURN [n in nodes(path) | n.name] as chain

-- Find most-called functions
MATCH (caller)-[r:CALLS]->(target)
RETURN target, count(r) as call_count
ORDER BY call_count DESC
LIMIT 10

-- Find files with most imports
MATCH (f:File)-[r:IMPORTS]->()
RETURN f.path, count(r) as import_count
ORDER BY import_count DESC

-- Find classes with no children (leaf classes)
MATCH (c:class)
WHERE NOT (c)<-[:EXTENDS]-()
RETURN c.name, c.file
```

### `find_function` / `find_class`
**Use for:** Quick discovery by name

**Supports wildcards:**
- `parse*` → parseFile, parser, parse_tree
- `*handler` → errorHandler, requestHandler
- `*test*` → test_main, TestCase

### `get_function_calls`
**Use for:** Understanding what a function does (outgoing edges)

**Returns:** List of called functions/methods

**Note:** Source must be function ID (e.g., `file.py::MyClass::method`)

### `get_function_callers`
**Use for:** Understanding who uses a function (incoming edges)

**Returns:** List of callers

**Useful for:** Refactoring, impact analysis

### `get_class_hierarchy`
**Use for:** Understanding inheritance

**Returns:** Parent classes, child classes

**Useful for:** Finding base implementations, understanding polymorphism

### `get_file_dependencies`
**Use for:** Understanding imports for a file

**Returns:** All IMPORTS edges from the file

**Useful for:** Dependency analysis, refactoring

### `get_file_structure`
**Use for:** Navigating folder hierarchy

**Returns:** Files and folders up to 3 levels deep

**Useful for:** Understanding project organization

### `find_variable_usage`
**Use for:** Tracking variable references

**Returns:** Functions/classes that use the variable

**Limitation:** Simplified tracking, may include false positives

### `get_symbol_context`
**Use for:** Complete overview of a symbol

**Returns:** All relationships for a function/class:
- Functions it calls
- Functions that call it
- Variables it uses
- Classes it extends

**Best for:** Starting point when investigating a symbol

---

## Query Strategy

### 1. Start Broad, Then Narrow
```
1. get_file_structure → understand layout
2. find_function/find_class → discover candidates
3. get_symbol_context → understand relationships
4. Read actual code → implementation details
```

### 2. Follow the Graph
```
User: "How does data flow from A to B?"

1. find_function "A" → get A's ID
2. get_function_calls → see what A calls
3. Recursively follow call chain
4. query_graph for multi-hop path if needed
```

### 3. Use Raw Queries for Complex Analysis
When built-in tools don't fit, use `query_graph` with custom Cypher.

**Example:** Find circular dependencies
```cypher
MATCH path = (f1:File)-[:IMPORTS*2..5]->(f1)
RETURN path
```

---

## Best Practices

### DO:
- ✅ Use graph for navigation, code reading for understanding
- ✅ Start with high-level tools (find_*, get_symbol_context)
- ✅ Use query_graph for complex multi-hop queries
- ✅ Check graph results are non-empty before proceeding
- ✅ Explain to user what you found in the graph

### DON'T:
- ❌ Use graph for implementation details (read code instead)
- ❌ Assume graph is complete (user may not have run analyzer)
- ❌ Over-rely on USES edges (simplified tracking)
- ❌ Ignore file paths in results (context is important)

### Edge Cases:
- **Empty results:** Graph may be stale, suggest re-running analyzer
- **Python-only:** Currently only Python has CALLS/EXTENDS/USES edges
- **External dependencies:** Graph only contains analyzed code, not stdlib/packages

---

## Example Interaction

**User:** "Find all functions that call `send_bulk` and show me the call chain"

**Claude Response:**

1. First, let me find where `send_bulk` is defined:
   ```
   find_function "send_bulk"
   ```
   Result: Found in `/project/services/analyzer-service/src/service/parsers/tree_parser.py::TreeParser::send_bulk`

2. Now find what calls it:
   ```
   get_function_callers "send_bulk"
   ```
   Result: Called by `traverse` function

3. Get the full context:
   ```
   get_symbol_context "traverse"
   ```
   Result: `traverse` is called by `start_tree_analysis`

4. Let me get the complete call chain using a raw query:
   ```
   query_graph:
   MATCH path = (start)-[:CALLS*1..5]->(end:function)
   WHERE end.name = "send_bulk"
   RETURN [n in nodes(path) | n.name] as call_chain
   ```

Based on the graph, the call chain is:
`start_tree_analysis` → `traverse` → `send_bulk`

Would you like me to read the actual implementation of any of these functions?

---

## Integration with Codebase Analysis

When Claude Code analyzes a codebase, it should:

1. **Check if Context Machine is available:**
   - Try a simple query like `find_function "*"`
   - If empty/error, suggest running the analyzer

2. **Use graph for high-level navigation:**
   - Map out architecture first
   - Identify key components and their relationships

3. **Read code for implementation:**
   - After locating relevant files via graph
   - For detailed understanding of logic

4. **Combine approaches:**
   - "I see from the graph that X calls Y, let me read X's implementation to understand how..."

---

## Prompting Tips for Users

Help users formulate graph-friendly questions:

**Instead of:** "Show me the code for parsing"
**Suggest:** "Let me find parse-related functions in the graph, then show you the relevant code"

**Instead of:** "What does this function do?"
**Suggest:** "Let me check what this function calls and uses, then examine its implementation"

**Instead of:** "Fix this bug"
**Suggest:** "Let me trace the call graph to understand how this code is invoked, then identify the issue"

---

## Future Extensions

The graph can be extended with:
- **More languages:** Add CALLS/EXTENDS for JS, Rust, etc.
- **More edge types:** IMPLEMENTS (interfaces), DECORATES, OVERRIDES
- **Annotations:** Add complexity metrics, test coverage to nodes
- **Dynamic analysis:** Merge runtime traces into graph

These extensions would enable more sophisticated queries while maintaining the core graph-based approach.
