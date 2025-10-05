# ./services/analyzer-service/src/service/parsers/edge_weights.py

"""
Bayesian frequency-based edge weighting for code knowledge graphs.

Principle: Start with uniform priors, then weight edges inversely by their
frequency in the graph. Rare edge types carry more information (higher weight).

This is analogous to IDF (Inverse Document Frequency) in information retrieval,
but applied to graph edge labels.
"""

from typing import Dict, List, Any
from collections import Counter
import math


class EdgeWeightComputer:
    """
    Computes edge weights based on label frequency distribution.

    Uses inverse frequency: rare edges get high weights, common edges get low weights.
    """

    def __init__(self, smoothing: float = 1.0):
        """
        Initialize edge weight computer.

        Args:
            smoothing: Laplace smoothing parameter (default 1.0 for uniform prior)
        """
        self.smoothing = smoothing
        self.edge_type_counts: Counter = Counter()
        self.total_edges: int = 0
        self.weights: Dict[str, float] = {}

    def fit(self, relations: List[Dict[str, Any]]) -> None:
        """
        Compute edge weights from a collection of relationships.

        Args:
            relations: List of edge dictionaries with 'type' field
        """
        # Count edge types
        for rel in relations:
            edge_type = rel.get("type")
            if edge_type:
                self.edge_type_counts[edge_type] += 1

        self.total_edges = sum(self.edge_type_counts.values())

        if self.total_edges == 0:
            return

        # Compute inverse frequency weights
        # w(t) = log(N / (count(t) + smoothing))
        # where N = total edges, count(t) = frequency of edge type t

        max_weight = 0.0
        raw_weights = {}

        for edge_type, count in self.edge_type_counts.items():
            # Inverse log frequency
            raw_weight = math.log((self.total_edges + self.smoothing) / (count + self.smoothing))
            raw_weights[edge_type] = raw_weight
            max_weight = max(max_weight, raw_weight)

        # Normalize to [0, 1]
        if max_weight > 0:
            self.weights = {
                edge_type: raw_weight / max_weight
                for edge_type, raw_weight in raw_weights.items()
            }
        else:
            # All edges have same frequency - uniform weights
            self.weights = {
                edge_type: 1.0
                for edge_type in self.edge_type_counts.keys()
            }

    def get_weight(self, edge_type: str) -> float:
        """
        Get the weight for a specific edge type.

        Args:
            edge_type: The edge label/type

        Returns:
            Weight in [0, 1], or 1.0 for unseen edge types (maximum information)
        """
        return self.weights.get(edge_type, 1.0)

    def get_frequency(self, edge_type: str) -> float:
        """
        Get the normalized frequency for an edge type.

        Args:
            edge_type: The edge label/type

        Returns:
            Frequency in [0, 1]
        """
        if self.total_edges == 0:
            return 0.0
        count = self.edge_type_counts.get(edge_type, 0)
        return count / self.total_edges

    def enrich_edges(self, relations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Add weight and frequency properties to edges.

        Args:
            relations: List of edge dictionaries

        Returns:
            Enriched edges with 'weight' and 'frequency' properties
        """
        enriched = []
        for rel in relations:
            rel_copy = rel.copy()
            edge_type = rel.get("type")

            if edge_type:
                rel_copy["weight"] = self.get_weight(edge_type)
                rel_copy["frequency"] = self.get_frequency(edge_type)
            else:
                rel_copy["weight"] = 1.0
                rel_copy["frequency"] = 0.0

            enriched.append(rel_copy)

        return enriched

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about edge type distribution.

        Returns:
            Dictionary with distribution statistics
        """
        if not self.edge_type_counts:
            return {}

        sorted_types = self.edge_type_counts.most_common()

        return {
            "total_edges": self.total_edges,
            "num_edge_types": len(self.edge_type_counts),
            "most_common": sorted_types[:5],
            "least_common": sorted_types[-5:],
            "entropy": self._compute_entropy(),
            "weights": dict(sorted(self.weights.items(), key=lambda x: x[1], reverse=True))
        }

    def _compute_entropy(self) -> float:
        """
        Compute Shannon entropy of edge type distribution.

        Higher entropy = more uniform distribution
        Lower entropy = more skewed distribution

        Returns:
            Entropy in bits
        """
        if self.total_edges == 0:
            return 0.0

        entropy = 0.0
        for count in self.edge_type_counts.values():
            p = count / self.total_edges
            if p > 0:
                entropy -= p * math.log2(p)

        return entropy


class SoftmaxEdgeWeightComputer(EdgeWeightComputer):
    """
    Alternative weighting using softmax temperature scaling.

    Can be used to make weight distribution more or less peaked.
    """

    def __init__(self, temperature: float = 1.0, smoothing: float = 1.0):
        """
        Initialize softmax edge weight computer.

        Args:
            temperature: Softmax temperature (higher = more uniform, lower = more peaked)
            smoothing: Laplace smoothing parameter
        """
        super().__init__(smoothing=smoothing)
        self.temperature = temperature

    def fit(self, relations: List[Dict[str, Any]]) -> None:
        """
        Compute softmax-scaled edge weights.

        Args:
            relations: List of edge dictionaries
        """
        # First compute frequencies
        super().fit(relations)

        if self.total_edges == 0:
            return

        # Compute inverse frequencies (before softmax)
        inverse_freqs = {}
        for edge_type, count in self.edge_type_counts.items():
            # Inverse frequency as logits
            inverse_freqs[edge_type] = math.log((self.total_edges + self.smoothing) / (count + self.smoothing))

        # Apply softmax with temperature
        # softmax(x_i) = exp(x_i / T) / sum(exp(x_j / T))
        exp_values = {
            edge_type: math.exp(logit / self.temperature)
            for edge_type, logit in inverse_freqs.items()
        }

        sum_exp = sum(exp_values.values())

        if sum_exp > 0:
            self.weights = {
                edge_type: exp_val / sum_exp
                for edge_type, exp_val in exp_values.items()
            }

            # Renormalize to [0, 1] range for consistency
            max_weight = max(self.weights.values()) if self.weights else 1.0
            if max_weight > 0:
                self.weights = {
                    edge_type: w / max_weight
                    for edge_type, w in self.weights.items()
                }


def compute_edge_weights(
    relations: List[Dict[str, Any]],
    method: str = "inverse_frequency",
    temperature: float = 1.0,
    smoothing: float = 1.0
) -> EdgeWeightComputer:
    """
    Convenience function to compute edge weights.

    Args:
        relations: List of edges
        method: 'inverse_frequency' or 'softmax'
        temperature: Temperature for softmax (ignored for inverse_frequency)
        smoothing: Laplace smoothing parameter

    Returns:
        Fitted EdgeWeightComputer instance
    """
    if method == "softmax":
        computer = SoftmaxEdgeWeightComputer(temperature=temperature, smoothing=smoothing)
    else:
        computer = EdgeWeightComputer(smoothing=smoothing)

    computer.fit(relations)
    return computer
