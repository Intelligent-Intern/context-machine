# Claude Code Integration Guide

This guide explains how to integrate Context Machine with Claude Code and Claude Desktop via MCP (Model Context Protocol).

---

## Prerequisites

1. **Start Context Machine infrastructure**
   ```bash
   make up
   ```

2. **Analyze your codebase** (creates the graph)
   ```bash
   curl -X POST http://localhost:3002/api/analyze \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev-key-123"
   ```

3. **Install MCP Python SDK**
   ```bash
   pip install mcp neo4j
   ```

---

## Setup for Claude Desktop

1. **Locate your Claude Desktop config**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add Context Machine MCP server**

   Edit your config file and add this entry (replace `<PATH_TO_REPO>` with actual path):

   ```json
   {
     "mcpServers": {
       "context-machine": {
         "command": "python",
         "args": ["<PATH_TO_REPO>/services/mcp-server/src/server.py"],
         "env": {
           "SERVICE_NEO4J_URI": "bolt://localhost:7687",
           "SERVICE_NEO4J_AUTH": "neo4j/test12345",
           "SERVICE_NEO4J_DATABASE": "neo4j"
         }
       }
     }
   }
   ```

   **Example:**
   ```json
   {
     "mcpServers": {
       "context-machine": {
         "command": "python",
         "args": ["/home/user/projects/context-machine/services/mcp-server/src/server.py"],
         "env": {
           "SERVICE_NEO4J_URI": "bolt://localhost:7687",
           "SERVICE_NEO4J_AUTH": "neo4j/test12345",
           "SERVICE_NEO4J_DATABASE": "neo4j"
         }
       }
     }
   }
   ```

3. **Update credentials** (if different from defaults)
   - Match `SERVICE_NEO4J_AUTH` to your `.env.local` settings
   - Default: `neo4j/test12345`

4. **Restart Claude Desktop**

---

## Setup for Claude Code (CLI)

Claude Code automatically discovers MCP servers via local config.

### Option 1: Project-local config (recommended)

Create `.mcp.json` in your project directory:

```bash
cd /path/to/your/project
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "context-machine": {
      "command": "python",
      "args": ["/full/path/to/context-machine/services/mcp-server/src/server.py"],
      "env": {
        "SERVICE_NEO4J_URI": "bolt://localhost:7687",
        "SERVICE_NEO4J_AUTH": "neo4j/test12345",
        "SERVICE_NEO4J_DATABASE": "neo4j"
      }
    }
  }
}
EOF
```

### Option 2: Global config

Edit `~/.config/claude-code/mcp_config.json` (create if missing):

```json
{
  "mcpServers": {
    "context-machine": {
      "command": "python",
      "args": ["/full/path/to/context-machine/services/mcp-server/src/server.py"],
      "env": {
        "SERVICE_NEO4J_URI": "bolt://localhost:7687",
        "SERVICE_NEO4J_AUTH": "neo4j/test12345",
        "SERVICE_NEO4J_DATABASE": "neo4j"
      }
    }
  }
}
```

---

## Installation Script

For convenience, use this script to auto-configure Claude Desktop:

```bash
#!/bin/bash
# install-mcp.sh

REPO_PATH="$(cd "$(dirname "$0")" && pwd)"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
else
    CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
fi

echo "Configuring Claude Desktop at: $CONFIG_PATH"
echo "Repository path: $REPO_PATH"

# Create config directory if needed
mkdir -p "$(dirname "$CONFIG_PATH")"

# Create or update config
if [ -f "$CONFIG_PATH" ]; then
    echo "Existing config found. Please manually add this entry:"
else
    echo "Creating new config..."
    cat > "$CONFIG_PATH" << EOF
{
  "mcpServers": {
    "context-machine": {
      "command": "python",
      "args": ["$REPO_PATH/services/mcp-server/src/server.py"],
      "env": {
        "SERVICE_NEO4J_URI": "bolt://localhost:7687",
        "SERVICE_NEO4J_AUTH": "neo4j/test12345",
        "SERVICE_NEO4J_DATABASE": "neo4j"
      }
    }
  }
}
EOF
fi

echo ""
echo "MCP server entry:"
echo ""
echo "\"context-machine\": {"
echo "  \"command\": \"python\","
echo "  \"args\": [\"$REPO_PATH/services/mcp-server/src/server.py\"],"
echo "  \"env\": {"
echo "    \"SERVICE_NEO4J_URI\": \"bolt://localhost:7687\","
echo "    \"SERVICE_NEO4J_AUTH\": \"neo4j/test12345\","
echo "    \"SERVICE_NEO4J_DATABASE\": \"neo4j\""
echo "  }"
echo "}"
echo ""
echo "Restart Claude Desktop to apply changes."
```

Make it executable:
```bash
chmod +x install-mcp.sh
./install-mcp.sh
```

---

## Verification

Once configured, Claude should have access to these tools:

| Tool | Description |
|------|-------------|
| `query_graph` | Execute raw Cypher queries |
| `find_function` | Search for functions by name |
| `find_class` | Search for classes by name |
| `get_function_calls` | Get functions called by a function |
| `get_function_callers` | Get functions that call a function |
| `get_class_hierarchy` | Get class inheritance tree |
| `get_file_dependencies` | Get file imports/dependencies |
| `get_file_structure` | Get folder/file tree |
| `find_variable_usage` | Find variable usage |
| `get_symbol_context` | Get complete context for a symbol |

Test it by asking Claude:
- "Find all functions named `parse*`"
- "What functions does `main` call?"
- "Show me the class hierarchy for `BaseParser`"

---

## Example Queries

### Find all Python parsers
```
Claude, use find_class to find all classes ending with "Parser"
```

### Get call graph for a function
```
Claude, use get_function_calls with function_id "/project/services/analyzer-service/src/app.py::start_tree_analysis"
```

### Find who uses a variable
```
Claude, use find_variable_usage to find where "driver" is used
```

### Raw Cypher query
```
Claude, use query_graph to execute:
MATCH (f)-[:IMPORTS]->(m)
WHERE m.target =~ ".*requests.*"
RETURN f.name, f.file
```

---

## Troubleshooting

### MCP server not connecting
- Ensure Neo4j is running: `docker ps | grep neo4j`
- Check credentials in config match `.env.local`
- Verify Python packages: `pip install mcp neo4j`
- Test server manually: `python services/mcp-server/src/server.py`

### Empty results
- Ensure analyzer has run successfully
- Check Neo4j Browser at http://localhost:7474
- Run test query: `MATCH (n) RETURN count(n)`

### Permission errors
- Use absolute paths in config files
- Ensure Python is in PATH: `which python`

### Wrong Python version
If using Python 3.11+:
```json
"command": "python3.11",
"args": ["..."]
```

---

## Advanced: Custom Queries

The `query_graph` tool accepts raw Cypher. Examples:

**Find functions with most dependencies:**
```cypher
MATCH (f:function)-[:USES]->(v)
RETURN f.name, f.file, count(v) as deps
ORDER BY deps DESC
LIMIT 10
```

**Find circular dependencies:**
```cypher
MATCH path = (f1:File)-[:IMPORTS*2..5]->(f1)
RETURN nodes(path)
```

**Get full call chain:**
```cypher
MATCH path = (start:function {name: "main"})-[:CALLS*1..5]->(end)
RETURN [node in nodes(path) | node.name] as call_chain
```

---

## Architecture: Why Graph > RAG

Traditional RAG (Retrieval Augmented Generation):
- Semantic similarity search via embeddings
- Returns similar text chunks
- **Fails on structural queries**: "What calls X?", "Show dependency chain"

Graph-based context:
- Explicit relationships between code entities
- Precise traversal queries
- Understands code structure, not just content

**Example:** Finding all functions that eventually call `send_bulk()` requires graph traversal, not text similarity.

---

## Next Steps

See `TECHNICAL_PROMPT.md` for guidance on how Claude should use these tools effectively.
