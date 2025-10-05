#!/usr/bin/env python3
"""
Example: Parse code and compute weighted edges for knowledge graph.

This demonstrates the full pipeline:
1. Parse code to extract symbols and relationships
2. Compute edge weights based on frequency distribution
3. Enrich edges with weights and other properties
4. Send to Neo4j with weight metadata
"""

from service.parsers import get_parser
from service.parsers.edge_weights import compute_edge_weights
import json


def analyze_file_with_weights(file_path: str, language: str = "python"):
    """
    Analyze a single file and compute weighted edges.

    Args:
        file_path: Path to source file
        language: Programming language

    Returns:
        Dictionary with symbols and weighted edges
    """
    # Step 1: Parse the code
    parser = get_parser(language)
    if not parser:
        raise ValueError(f"No parser available for language: {language}")

    with open(file_path, 'r') as f:
        content = f.read()

    result = parser.parse(content, path=file_path)

    print(f"Parsed {file_path}:")
    print(f"  - {len(result.symbols)} symbols")
    print(f"  - {len(result.relations)} relationships")

    # Step 2: Compute edge weights
    weight_computer = compute_edge_weights(result.relations, method="inverse_frequency")

    # Show statistics
    stats = weight_computer.get_statistics()
    print(f"\nEdge Statistics:")
    print(f"  - Total edges: {stats['total_edges']}")
    print(f"  - Edge types: {stats['num_edge_types']}")
    print(f"  - Entropy: {stats['entropy']:.2f} bits")

    print(f"\nMost informative edge types:")
    for edge_type, weight in list(stats['weights'].items())[:5]:
        freq = weight_computer.get_frequency(edge_type)
        print(f"  - {edge_type}: weight={weight:.3f}, freq={freq:.3f}")

    # Step 3: Enrich edges with weights
    enriched_edges = weight_computer.enrich_edges(result.relations)

    return {
        "symbols": result.symbols,
        "relations": enriched_edges,
        "diagnostics": result.diagnostics,
        "stats": stats
    }


def analyze_project_with_weights(file_paths: list, language: str = "python"):
    """
    Analyze multiple files and compute global edge weights.

    This is the recommended approach for projects, as weights are computed
    across the entire codebase for better information-theoretic properties.

    Args:
        file_paths: List of source file paths
        language: Programming language

    Returns:
        Dictionary with all symbols and globally weighted edges
    """
    parser = get_parser(language)
    if not parser:
        raise ValueError(f"No parser available for language: {language}")

    all_symbols = []
    all_relations = []

    # Step 1: Parse all files
    print(f"Parsing {len(file_paths)} files...")
    for file_path in file_paths:
        try:
            with open(file_path, 'r') as f:
                content = f.read()

            result = parser.parse(content, path=file_path)
            all_symbols.extend(result.symbols)
            all_relations.extend(result.relations)
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")

    print(f"Total: {len(all_symbols)} symbols, {len(all_relations)} relationships")

    # Step 2: Compute global edge weights
    weight_computer = compute_edge_weights(all_relations, method="inverse_frequency")

    # Show statistics
    stats = weight_computer.get_statistics()
    print(f"\nGlobal Edge Statistics:")
    print(f"  - Total edges: {stats['total_edges']}")
    print(f"  - Edge types: {stats['num_edge_types']}")
    print(f"  - Entropy: {stats['entropy']:.2f} bits")

    print(f"\nEdge type distribution:")
    print(f"{'Edge Type':<20} {'Count':>8} {'Freq':>8} {'Weight':>8}")
    print("-" * 50)
    for edge_type, count in stats['most_common']:
        freq = weight_computer.get_frequency(edge_type)
        weight = weight_computer.get_weight(edge_type)
        print(f"{edge_type:<20} {count:>8} {freq:>7.1%} {weight:>7.3f}")

    # Step 3: Enrich all edges
    enriched_edges = weight_computer.enrich_edges(all_relations)

    return {
        "symbols": all_symbols,
        "relations": enriched_edges,
        "stats": stats
    }


def prepare_for_neo4j(symbols, relations):
    """
    Format data for Neo4j bulk import.

    Weights are stored as edge properties.

    Args:
        symbols: List of symbol dictionaries
        relations: List of enriched edge dictionaries

    Returns:
        Dictionary formatted for Neo4j bulk API
    """
    # Format nodes
    nodes = []
    for sym in symbols:
        node = {
            "label": sym.get("type", "Symbol"),
            "id": sym.get("id", sym.get("name")),
            "name": sym.get("name"),
            "path": sym.get("file"),
            "properties": {
                "language": sym.get("language"),
                **{k: v for k, v in sym.items() if k not in ["type", "name", "id", "file", "language"]}
            }
        }
        nodes.append(node)

    # Format edges with weights
    edges = []
    for rel in relations:
        edge = {
            "type": rel.get("type"),
            "source_id": rel.get("source"),
            "target_id": rel.get("target"),
            "properties": {
                "weight": rel.get("weight", 1.0),
                "frequency": rel.get("frequency", 0.0),
                # Include any other properties
                **{k: v for k, v in rel.items() if k not in ["type", "source", "target", "weight", "frequency"]}
            }
        }
        edges.append(edge)

    return {
        "nodes": nodes,
        "edges": edges
    }


def main():
    """Example usage."""
    # Example 1: Single file
    print("=" * 60)
    print("Example 1: Single File Analysis")
    print("=" * 60)

    result = analyze_file_with_weights(
        "src/service/parsers/python_parser.py",
        language="python"
    )

    # Show example enriched edges
    print("\nExample enriched edges:")
    for edge in result["relations"][:5]:
        print(f"  {edge['source']} --[{edge['type']}]--> {edge['target']}")
        print(f"    weight: {edge['weight']:.3f}, frequency: {edge['frequency']:.3f}")

    # Example 2: Full project
    print("\n" + "=" * 60)
    print("Example 2: Project-Wide Analysis")
    print("=" * 60)

    import glob
    python_files = glob.glob("src/service/parsers/*.py")
    python_files = [f for f in python_files if not f.endswith("__init__.py")][:5]  # Limit for demo

    project_result = analyze_project_with_weights(python_files, language="python")

    # Prepare for Neo4j
    neo4j_data = prepare_for_neo4j(
        project_result["symbols"],
        project_result["relations"]
    )

    print(f"\nFormatted for Neo4j:")
    print(f"  - {len(neo4j_data['nodes'])} nodes")
    print(f"  - {len(neo4j_data['edges'])} edges")

    # Save to file for inspection
    with open("/tmp/weighted_graph.json", "w") as f:
        json.dump(neo4j_data, f, indent=2)
    print(f"\nSaved to /tmp/weighted_graph.json")

    # Example edge with properties
    if neo4j_data["edges"]:
        print("\nExample edge structure:")
        print(json.dumps(neo4j_data["edges"][0], indent=2))


if __name__ == "__main__":
    main()
