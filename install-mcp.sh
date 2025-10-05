#!/bin/bash
# install-mcp.sh - Auto-configure Context Machine MCP server for Claude Desktop

set -e

REPO_PATH="$(cd "$(dirname "$0")" && pwd)"

echo "=== Context Machine MCP Installer ==="
echo ""
echo "Repository path: $REPO_PATH"
echo ""

# Detect OS and config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
else
    CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
fi

echo "Claude Desktop config: $CONFIG_PATH"
echo ""

# Check Python
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.11+"
    exit 1
fi

PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
echo "✓ Python found: $PYTHON_VERSION"

# Check MCP package
if ! python -c "import mcp" 2>/dev/null; then
    echo "⚠️  MCP package not installed. Installing..."
    pip install mcp neo4j
else
    echo "✓ MCP package installed"
fi

echo ""

# Create config directory if needed
mkdir -p "$(dirname "$CONFIG_PATH")"

# Check if config exists
if [ -f "$CONFIG_PATH" ]; then
    echo "⚠️  Existing config found at: $CONFIG_PATH"
    echo ""
    echo "Please manually add this entry to your 'mcpServers' section:"
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
    echo "✓ Config created successfully"
    echo ""
fi

echo "=== Next Steps ==="
echo ""
echo "1. Start Context Machine:"
echo "   make up"
echo ""
echo "2. Analyze your codebase:"
echo "   curl -X POST http://localhost:3002/api/analyze \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-API-Key: dev-key-123'"
echo ""
echo "3. Restart Claude Desktop"
echo ""
echo "4. Test in Claude: 'Find all functions named parse*'"
echo ""
