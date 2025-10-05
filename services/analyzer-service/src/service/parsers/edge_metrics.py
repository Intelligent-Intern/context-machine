# ./services/analyzer-service/src/service/parsers/edge_metrics.py

"""
Multi-dimensional edge metrics for code graphs.

Combines multiple O(n) metrics to capture different aspects of edge importance:
1. Inverse frequency: Structural rarity (what we already have)
2. Functional criticality: Execution/bug-prone relationships
3. Local centrality: Node degree approximation
4. Semantic depth: How deep in call/scope hierarchy

All metrics are O(n) computable for scalability.
"""

from typing import Dict, List, Any, Set, Tuple
from collections import Counter, defaultdict
import math


class MultiMetricEdgeWeighting:
    """
    Compute multiple O(n) edge importance metrics.

    Dimensions:
    - structural: Inverse frequency (rare edges)
    - functional: Execution criticality (debugging importance)
    - centrality: Local degree-based importance
    - depth: Position in call/scope hierarchy
    """

    def __init__(self):
        self.edge_counts = Counter()
        self.total_edges = 0

        # Node-level metrics (O(n))
        self.node_in_degree = Counter()
        self.node_out_degree = Counter()
        self.node_types = {}  # node_id -> symbol type

        # Edge groupings
        self.execution_edges = set()  # Edges that affect runtime
        self.structural_edges = set()  # Edges that are just structure
        self.data_flow_edges = set()  # Edges for data dependencies

        # Results
        self.metrics = {}

    def fit(self, symbols: List[Dict], relations: List[Dict]) -> None:
        """
        Compute all metrics in O(n) time.

        Args:
            symbols: List of symbol nodes
            relations: List of edge relationships
        """
        # Pass 1: Count edge types and node degrees (O(n))
        for rel in relations:
            edge_type = rel.get("type")
            source = rel.get("source")
            target = rel.get("target")

            if not edge_type or not source:
                continue

            self.edge_counts[edge_type] += 1
            self.total_edges += 1

            self.node_out_degree[source] += 1
            if target:
                self.node_in_degree[target] += 1

            # Categorize edges
            if edge_type in ("CALLS", "ASYNC_AWAITS", "INSTANTIATES", "RAISES", "CATCHES"):
                self.execution_edges.add(edge_type)
            elif edge_type in ("EXTENDS", "IMPLEMENTS", "DECORATES", "IMPORTS"):
                self.structural_edges.add(edge_type)
            elif edge_type in ("DEFINES", "USES", "READS", "WRITES", "RETURNS", "YIELDS"):
                self.data_flow_edges.add(edge_type)

        # Store node types
        for sym in symbols:
            node_id = sym.get("id") or sym.get("name")
            self.node_types[node_id] = sym.get("type")

        # Pass 2: Compute metrics for each edge (O(n))
        for rel in relations:
            edge_type = rel.get("type")
            source = rel.get("source")
            target = rel.get("target")

            if not edge_type or not source:
                continue

            edge_key = (source, edge_type, target)

            # Metric 1: Structural rarity (inverse frequency)
            structural = self._compute_structural_weight(edge_type)

            # Metric 2: Functional criticality
            functional = self._compute_functional_weight(edge_type, source, target)

            # Metric 3: Local centrality importance
            centrality = self._compute_centrality_weight(source, target)

            # Metric 4: Semantic depth (how nested in scope)
            depth = self._compute_depth_weight(source, target)

            self.metrics[edge_key] = {
                "structural": structural,
                "functional": functional,
                "centrality": centrality,
                "depth": depth,
            }

    def _compute_structural_weight(self, edge_type: str) -> float:
        """
        Inverse frequency weight (what we had before).

        Returns: [0, 1] where 1 = rare, 0 = common
        """
        if self.total_edges == 0:
            return 1.0

        count = self.edge_counts.get(edge_type, 0)
        if count == 0:
            return 1.0

        # Inverse log frequency
        weight = math.log((self.total_edges + 1) / (count + 1))
        max_weight = math.log(self.total_edges + 1)

        return weight / max_weight if max_weight > 0 else 1.0

    def _compute_functional_weight(self, edge_type: str, source: str, target: str) -> float:
        """
        Functional/execution criticality.

        High weight = affects execution/debugging
        Low weight = just structural

        CALLS, USES chains are HIGH (debugging importance)
        EXTENDS, IMPLEMENTS are LOW (just declarations)

        Returns: [0, 1] where 1 = critical for execution
        """
        # Execution edges: directly affect runtime behavior
        if edge_type in ("CALLS", "ASYNC_AWAITS", "YIELDS", "RETURNS"):
            return 1.0  # Critical for execution flow

        # Exception handling: critical for debugging
        if edge_type in ("RAISES", "CATCHES"):
            return 0.95

        # Data flow: medium-high importance
        if edge_type in ("DEFINES", "WRITES", "INSTANTIATES"):
            return 0.8

        if edge_type in ("USES", "READS"):
            return 0.7

        # Context management: medium
        if edge_type == "WITH_CONTEXT":
            return 0.65

        # Method overriding: affects behavior but predictable
        if edge_type in ("OVERRIDES", "DECORATES"):
            return 0.5

        # Pure structure: low functional importance
        if edge_type in ("EXTENDS", "IMPLEMENTS", "IMPORTS"):
            return 0.2

        return 0.5  # Default

    def _compute_centrality_weight(self, source: str, target: str) -> float:
        """
        Local centrality approximation (O(1) lookup).

        High weight = nodes with many connections (central)
        Low weight = leaf nodes

        Uses pre-computed degree from Pass 1.

        Returns: [0, 1] where 1 = highly central
        """
        # Source node centrality
        out_deg = self.node_out_degree.get(source, 0)
        in_deg = self.node_in_degree.get(source, 0)
        source_centrality = math.log1p(out_deg + in_deg) / math.log1p(50)  # Normalize to ~50 max

        # Target node centrality
        if target:
            target_out = self.node_out_degree.get(target, 0)
            target_in = self.node_in_degree.get(target, 0)
            target_centrality = math.log1p(target_out + target_in) / math.log1p(50)
        else:
            target_centrality = 0.0

        # Edge connecting two central nodes is more important
        combined = (source_centrality + target_centrality) / 2

        return min(1.0, combined)

    def _compute_depth_weight(self, source: str, target: str) -> float:
        """
        Semantic depth: how nested in scope hierarchy.

        Deeper scopes = more specific/detailed = higher weight
        Top-level imports = shallow = lower weight

        Approximated by counting '::' in source path.

        Returns: [0, 1] where 1 = deep in hierarchy
        """
        # Count scope depth from source identifier
        source_depth = source.count("::") if source else 0
        target_depth = target.count("::") if target else 0

        # Deeper = more specific = more important for local reasoning
        max_depth = max(source_depth, target_depth)

        # Normalize (most code is 0-5 levels deep)
        return min(1.0, max_depth / 5.0)

    def get_combined_weight(
        self,
        source: str,
        edge_type: str,
        target: str,
        weights: Dict[str, float] = None
    ) -> float:
        """
        Get combined weight for an edge.

        Args:
            source: Source node
            edge_type: Edge type
            target: Target node
            weights: Optional dimension weights, e.g.:
                {"structural": 0.2, "functional": 0.5, "centrality": 0.2, "depth": 0.1}
                If None, uses balanced default.

        Returns:
            Combined weight in [0, 1]
        """
        if weights is None:
            # Default: emphasize functional over structural
            weights = {
                "structural": 0.2,    # Rare edges matter, but not most
                "functional": 0.5,    # Execution/debugging is primary
                "centrality": 0.2,    # Central nodes are important
                "depth": 0.1          # Depth is secondary
            }

        edge_key = (source, edge_type, target)
        metrics = self.metrics.get(edge_key)

        if not metrics:
            return 0.5  # Unknown edge

        combined = sum(
            metrics[dim] * weight
            for dim, weight in weights.items()
            if dim in metrics
        )

        return min(1.0, combined)

    def enrich_edges(
        self,
        relations: List[Dict],
        dimension_weights: Dict[str, float] = None
    ) -> List[Dict]:
        """
        Enrich edges with all computed metrics.

        Args:
            relations: Original edges
            dimension_weights: Optional weights for combined score

        Returns:
            Enriched edges with metric properties
        """
        enriched = []

        for rel in relations:
            rel_copy = rel.copy()
            source = rel.get("source")
            edge_type = rel.get("type")
            target = rel.get("target")

            if not source or not edge_type:
                enriched.append(rel_copy)
                continue

            edge_key = (source, edge_type, target)
            metrics = self.metrics.get(edge_key, {})

            # Add individual dimensions
            rel_copy["structural_weight"] = metrics.get("structural", 0.5)
            rel_copy["functional_weight"] = metrics.get("functional", 0.5)
            rel_copy["centrality_weight"] = metrics.get("centrality", 0.5)
            rel_copy["depth_weight"] = metrics.get("depth", 0.5)

            # Add combined weight
            rel_copy["weight"] = self.get_combined_weight(
                source, edge_type, target, dimension_weights
            )

            # Add interpretable labels
            rel_copy["importance_level"] = self._get_importance_level(rel_copy["weight"])

            enriched.append(rel_copy)

        return enriched

    def _get_importance_level(self, weight: float) -> str:
        """Convert weight to categorical label."""
        if weight > 0.75:
            return "CRITICAL"
        elif weight > 0.6:
            return "HIGH"
        elif weight > 0.4:
            return "MEDIUM"
        else:
            return "LOW"

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about edge metrics."""
        if not self.metrics:
            return {}

        # Aggregate statistics per dimension
        by_dimension = defaultdict(list)
        for metrics in self.metrics.values():
            for dim, value in metrics.items():
                by_dimension[dim].append(value)

        stats = {
            "total_edges": self.total_edges,
            "unique_edge_types": len(self.edge_counts),
            "dimensions": {}
        }

        for dim, values in by_dimension.items():
            stats["dimensions"][dim] = {
                "mean": sum(values) / len(values),
                "min": min(values),
                "max": max(values),
                "std": math.sqrt(sum((v - sum(values)/len(values))**2 for v in values) / len(values))
            }

        # Edge type categorization
        stats["edge_categories"] = {
            "execution": list(self.execution_edges),
            "structural": list(self.structural_edges),
            "data_flow": list(self.data_flow_edges)
        }

        return stats


def compute_multi_metrics(
    symbols: List[Dict],
    relations: List[Dict],
    dimension_weights: Dict[str, float] = None
) -> MultiMetricEdgeWeighting:
    """
    Convenience function to compute multi-dimensional edge metrics.

    Args:
        symbols: List of symbol nodes
        relations: List of edges
        dimension_weights: Optional weights for combined score

    Returns:
        Fitted MultiMetricEdgeWeighting instance
    """
    computer = MultiMetricEdgeWeighting()
    computer.fit(symbols, relations)
    return computer
