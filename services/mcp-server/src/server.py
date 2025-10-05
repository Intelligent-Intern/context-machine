#!/usr/bin/env python3
"""
MCP Server for Context Machine - Exposes Neo4j code graph to Claude
"""

import os
import json
import asyncio
from typing import Any, Sequence
from mcp.server import Server
from mcp.types import Tool, TextContent, Resource, EmbeddedResource
from neo4j import GraphDatabase

# Neo4j connection
NEO4J_URI = os.getenv("SERVICE_NEO4J_URI", "bolt://localhost:7687")
auth = os.getenv("SERVICE_NEO4J_AUTH", "neo4j/test12345").split("/")
NEO4J_USER, NEO4J_PASSWORD = auth[0], auth[1] if len(auth) > 1 else None
NEO4J_DATABASE = os.getenv("SERVICE_NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# Create MCP server
app = Server("context-machine")


def run_query(cypher: str, params: dict = None) -> list:
    """Execute a Cypher query and return results"""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run(cypher, params or {})
        return [record.data() for record in result]


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools"""
    return [
        Tool(
            name="query_graph",
            description="Execute a raw Cypher query against the code graph. Use this for complex queries.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Cypher query to execute"},
                    "params": {"type": "object", "description": "Query parameters (optional)"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="find_function",
            description="Find functions by name (supports wildcards with *)",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Function name or pattern (e.g., 'parse*')"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="find_class",
            description="Find classes by name (supports wildcards with *)",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Class name or pattern"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="get_function_calls",
            description="Get all functions called by a specific function (outgoing calls)",
            inputSchema={
                "type": "object",
                "properties": {
                    "function_id": {"type": "string", "description": "Function identifier (e.g., 'file.py::main')"}
                },
                "required": ["function_id"]
            }
        ),
        Tool(
            name="get_function_callers",
            description="Get all functions that call a specific function (incoming calls)",
            inputSchema={
                "type": "object",
                "properties": {
                    "function_name": {"type": "string", "description": "Target function name"}
                },
                "required": ["function_name"]
            }
        ),
        Tool(
            name="get_class_hierarchy",
            description="Get inheritance hierarchy for a class (parents and children)",
            inputSchema={
                "type": "object",
                "properties": {
                    "class_name": {"type": "string", "description": "Class name"}
                },
                "required": ["class_name"]
            }
        ),
        Tool(
            name="get_file_dependencies",
            description="Get all modules/files imported by a specific file",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "File path"}
                },
                "required": ["file_path"]
            }
        ),
        Tool(
            name="get_file_structure",
            description="Get folder/file tree structure starting from a path",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Starting path (optional, defaults to root)"}
                }
            }
        ),
        Tool(
            name="find_variable_usage",
            description="Find where a variable is used across the codebase",
            inputSchema={
                "type": "object",
                "properties": {
                    "variable_name": {"type": "string", "description": "Variable name"}
                },
                "required": ["variable_name"]
            }
        ),
        Tool(
            name="get_symbol_context",
            description="Get complete context for a symbol (function/class): definition, calls, dependencies",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol_name": {"type": "string", "description": "Symbol name (function or class)"}
                },
                "required": ["symbol_name"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> Sequence[TextContent]:
    """Handle tool calls"""

    try:
        if name == "query_graph":
            query = arguments["query"]
            params = arguments.get("params", {})
            results = run_query(query, params)
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "find_function":
            pattern = arguments["name"].replace("*", ".*")
            query = """
            MATCH (f:function)
            WHERE f.name =~ $pattern
            RETURN f.name as name, f.file as file, f.id as id, f.language as language
            LIMIT 50
            """
            results = run_query(query, {"pattern": f"(?i){pattern}"})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "find_class":
            pattern = arguments["name"].replace("*", ".*")
            query = """
            MATCH (c:class)
            WHERE c.name =~ $pattern
            RETURN c.name as name, c.file as file, c.id as id, c.language as language
            LIMIT 50
            """
            results = run_query(query, {"pattern": f"(?i){pattern}"})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "get_function_calls":
            func_id = arguments["function_id"]
            query = """
            MATCH (f {id: $func_id})-[r:CALLS]->(target)
            RETURN r.target as called_function, type(r) as relationship
            """
            results = run_query(query, {"func_id": func_id})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "get_function_callers":
            func_name = arguments["function_name"]
            query = """
            MATCH (f:function)-[r:CALLS]->(target)
            WHERE r.target =~ $pattern
            RETURN f.name as caller, f.file as file, f.id as caller_id
            """
            results = run_query(query, {"pattern": f"(?i).*{func_name}.*"})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "get_class_hierarchy":
            class_name = arguments["class_name"]
            query = """
            MATCH (c:class {name: $class_name})
            OPTIONAL MATCH (c)-[:EXTENDS]->(parent)
            OPTIONAL MATCH (child)-[:EXTENDS]->(c)
            RETURN c.name as class_name, c.file as file,
                   collect(DISTINCT parent.name) as parent_classes,
                   collect(DISTINCT child.name) as child_classes
            """
            results = run_query(query, {"class_name": class_name})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "get_file_dependencies":
            file_path = arguments["file_path"]
            query = """
            MATCH (f {path: $file_path})-[r:IMPORTS]->(target)
            RETURN r.target as imported_module, type(r) as relationship
            """
            results = run_query(query, {"file_path": file_path})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "get_file_structure":
            path = arguments.get("path", "/project")
            query = """
            MATCH (folder:Folder {path: $path})-[:CONTAINS*0..3]->(item)
            WHERE item:Folder OR item:File
            RETURN item.name as name, item.path as path,
                   labels(item) as type, item.extension as extension
            LIMIT 100
            """
            results = run_query(query, {"path": path})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "find_variable_usage":
            var_name = arguments["variable_name"]
            query = """
            MATCH (f)-[r:USES]->(target)
            WHERE r.target = $var_name OR r.target =~ $pattern
            RETURN f.name as function, f.file as file, r.target as variable
            LIMIT 50
            """
            results = run_query(query, {"var_name": var_name, "pattern": f"(?i).*{var_name}.*"})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        elif name == "get_symbol_context":
            symbol_name = arguments["symbol_name"]
            query = """
            MATCH (s)
            WHERE (s:function OR s:class) AND s.name = $symbol_name
            OPTIONAL MATCH (s)-[r1:CALLS]->(called)
            OPTIONAL MATCH (caller)-[r2:CALLS]->(s)
            OPTIONAL MATCH (s)-[r3:USES]->(vars)
            OPTIONAL MATCH (s)-[r4:EXTENDS]->(parent)
            RETURN s.name as name, s.file as file, s.id as id, labels(s) as type,
                   collect(DISTINCT r1.target) as calls,
                   collect(DISTINCT caller.name) as called_by,
                   collect(DISTINCT r3.target) as uses_variables,
                   collect(DISTINCT parent.name) as extends
            """
            results = run_query(query, {"symbol_name": symbol_name})
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]

        else:
            return [TextContent(
                type="text",
                text=f"Unknown tool: {name}"
            )]

    except Exception as e:
        return [TextContent(
            type="text",
            text=f"Error: {str(e)}"
        )]


@app.list_resources()
async def list_resources() -> list[Resource]:
    """List available resources"""
    return [
        Resource(
            uri="context://graph-schema",
            name="Graph Schema",
            mimeType="application/json",
            description="Neo4j graph schema showing node types and relationship types"
        )
    ]


@app.read_resource()
async def read_resource(uri: str) -> str:
    """Read a resource"""
    if uri == "context://graph-schema":
        schema = {
            "nodes": [
                {"label": "function", "properties": ["name", "id", "file", "language"]},
                {"label": "class", "properties": ["name", "id", "file", "language"]},
                {"label": "File", "properties": ["name", "path", "extension"]},
                {"label": "Folder", "properties": ["name", "path"]}
            ],
            "relationships": [
                {"type": "CALLS", "description": "Function A calls function B"},
                {"type": "EXTENDS", "description": "Class A extends class B"},
                {"type": "USES", "description": "Function uses variable"},
                {"type": "IMPORTS", "description": "File imports module"},
                {"type": "CONTAINS", "description": "Folder/File containment"}
            ]
        }
        return json.dumps(schema, indent=2)

    raise ValueError(f"Unknown resource: {uri}")


async def main():
    """Run the MCP server"""
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
