#!/usr/bin/env python3
"""
MCP Server for Context Machine - Exposes Neo4j code graph to Claude
"""

import os
import json
from typing import Any, Optional
from mcp.server.fastmcp import FastMCP
from neo4j import GraphDatabase

# Neo4j connection
NEO4J_URI = os.getenv("SERVICE_NEO4J_URI", "bolt://localhost:7687")
auth = os.getenv("SERVICE_NEO4J_AUTH", "neo4j/test12345").split("/")
NEO4J_USER, NEO4J_PASSWORD = auth[0], auth[1] if len(auth) > 1 else None
NEO4J_DATABASE = os.getenv("SERVICE_NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# Create FastMCP server
mcp = FastMCP("context-machine")


def run_query(cypher: str, params: dict = None) -> list:
    """Execute a Cypher query and return results"""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run(cypher, params or {})
        return [record.data() for record in result]


# Tools - FastMCP automatically handles registration via decorators

@mcp.tool()
def query_graph(query: str, params: Optional[dict] = None) -> str:
    """Execute a raw Cypher query against the code graph. Use this for complex queries."""
    try:
        results = run_query(query, params or {})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def find_function(name: str) -> str:
    """Find functions by name (supports wildcards with *)"""
    try:
        pattern = name.replace("*", ".*")
        query = """
        MATCH (f:function)
        WHERE f.name =~ $pattern
        RETURN f.name as name, f.file as file, f.id as id, f.language as language
        LIMIT 50
        """
        results = run_query(query, {"pattern": f"(?i){pattern}"})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def find_class(name: str) -> str:
    """Find classes by name (supports wildcards with *)"""
    try:
        pattern = name.replace("*", ".*")
        query = """
        MATCH (c:class)
        WHERE c.name =~ $pattern
        RETURN c.name as name, c.file as file, c.id as id, c.language as language
        LIMIT 50
        """
        results = run_query(query, {"pattern": f"(?i){pattern}"})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def get_function_calls(function_id: str) -> str:
    """Get all functions called by a specific function (outgoing calls)"""
    try:
        query = """
        MATCH (f {id: $func_id})-[r:CALLS]->(target)
        RETURN r.target as called_function, type(r) as relationship
        """
        results = run_query(query, {"func_id": function_id})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def get_function_callers(function_name: str) -> str:
    """Get all functions that call a specific function (incoming calls)"""
    try:
        query = """
        MATCH (f:function)-[r:CALLS]->(target)
        WHERE r.target =~ $pattern
        RETURN f.name as caller, f.file as file, f.id as caller_id
        """
        results = run_query(query, {"pattern": f"(?i).*{function_name}.*"})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def get_class_hierarchy(class_name: str) -> str:
    """Get inheritance hierarchy for a class (parents and children)"""
    try:
        query = """
        MATCH (c:class {name: $class_name})
        OPTIONAL MATCH (c)-[:EXTENDS]->(parent)
        OPTIONAL MATCH (child)-[:EXTENDS]->(c)
        RETURN c.name as class_name, c.file as file,
               collect(DISTINCT parent.name) as parent_classes,
               collect(DISTINCT child.name) as child_classes
        """
        results = run_query(query, {"class_name": class_name})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def get_file_dependencies(file_path: str) -> str:
    """Get all modules/files imported by a specific file"""
    try:
        query = """
        MATCH (f {path: $file_path})-[r:IMPORTS]->(target)
        RETURN r.target as imported_module, type(r) as relationship
        """
        results = run_query(query, {"file_path": file_path})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def get_file_structure(path: str = "/project") -> str:
    """Get folder/file tree structure starting from a path"""
    try:
        query = """
        MATCH (folder:Folder {path: $path})-[:CONTAINS*0..3]->(item)
        WHERE item:Folder OR item:File
        RETURN item.name as name, item.path as path,
               labels(item) as type, item.extension as extension
        LIMIT 100
        """
        results = run_query(query, {"path": path})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def find_variable_usage(variable_name: str) -> str:
    """Find where a variable is used across the codebase"""
    try:
        query = """
        MATCH (f)-[r:USES]->(target)
        WHERE r.target = $var_name OR r.target =~ $pattern
        RETURN f.name as function, f.file as file, r.target as variable
        LIMIT 50
        """
        results = run_query(query, {"var_name": variable_name, "pattern": f"(?i).*{variable_name}.*"})
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def get_symbol_context(symbol_name: str) -> str:
    """Get complete context for a symbol (function/class): definition, calls, dependencies"""
    try:
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
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# Resources - FastMCP automatically handles registration via decorators

@mcp.resource("context://graph-schema")
def get_graph_schema() -> str:
    """Neo4j graph schema showing node types and relationship types"""
    schema = {
        "nodes": [
            {"label": "function", "properties": ["name", "id", "file", "language", "is_async"]},
            {"label": "class", "properties": ["name", "id", "file", "language"]},
            {"label": "File", "properties": ["name", "path", "extension"]},
            {"label": "Folder", "properties": ["name", "path"]}
        ],
        "relationships": [
            # Original edges
            {"type": "CALLS", "description": "Function A calls function B"},
            {"type": "EXTENDS", "description": "Class A extends class B (inheritance)"},
            {"type": "USES", "description": "Function uses variable"},
            {"type": "IMPORTS", "description": "File imports module"},
            {"type": "CONTAINS", "description": "Folder/File containment hierarchy"},

            # Python ontology extensions
            {"type": "IMPLEMENTS", "description": "Class implements Protocol/ABC"},
            {"type": "DECORATES", "description": "Decorator applied to function/class"},
            {"type": "OVERRIDES", "description": "Method overrides parent class method"},

            # Control flow & exceptions
            {"type": "RAISES", "description": "Function raises exception"},
            {"type": "CATCHES", "description": "Function catches exception"},
            {"type": "YIELDS", "description": "Generator yields value"},
            {"type": "RETURNS", "description": "Function returns value/type"},
            {"type": "ASYNC_AWAITS", "description": "Async function awaits coroutine"},

            # Object relationships
            {"type": "INSTANTIATES", "description": "Function creates instance of class"},
            {"type": "DEFINES", "description": "Function defines variable/constant"},
            {"type": "READS", "description": "Function reads attribute/property"},
            {"type": "WRITES", "description": "Function writes to attribute/property"},
            {"type": "WITH_CONTEXT", "description": "Function uses context manager (with statement)"}
        ]
    }
    return json.dumps(schema, indent=2)


# Prompts - Add some useful code analysis prompts

@mcp.prompt()
def analyze_function(function_name: str, analysis_type: str = "full") -> str:
    """Generate a prompt for analyzing a function in the codebase"""
    analysis_types = {
        "full": "Please provide a comprehensive analysis including purpose, dependencies, callers, and potential issues",
        "performance": "Please analyze this function for performance bottlenecks and optimization opportunities",
        "security": "Please analyze this function for potential security vulnerabilities",
        "refactor": "Please suggest refactoring opportunities to improve code quality and maintainability"
    }

    return f"""Analyze the function '{function_name}' in the codebase.

{analysis_types.get(analysis_type, analysis_types['full'])}

Please use the available tools to:
1. Find the function definition
2. Get its callers and callees
3. Examine variable usage
4. Check class relationships if it's a method"""


@mcp.prompt()
def trace_execution(entry_point: str, target: str) -> str:
    """Generate a prompt for tracing execution paths between two functions"""
    return f"""Trace the execution path from '{entry_point}' to '{target}'.

Please use the graph query tools to:
1. Find all possible paths between these functions
2. Identify intermediate function calls
3. Highlight any conditional branches
4. Note any async/await patterns in the path"""


@mcp.prompt()
def impact_analysis(symbol_name: str) -> str:
    """Generate a prompt for analyzing the impact of changing a symbol"""
    return f"""Perform an impact analysis for modifying '{symbol_name}'.

Please identify:
1. All direct callers/users of this symbol
2. Transitive dependencies (what depends on the callers)
3. Files that would need to be tested
4. Potential breaking changes"""
