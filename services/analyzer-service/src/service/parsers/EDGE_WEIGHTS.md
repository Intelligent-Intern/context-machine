# Edge Weights: Information-Theoretic Graph Enrichment

## Motivation

Traditional knowledge graphs treat all edges equally, but not all relationships carry the same information. A rare relationship (e.g., `IMPLEMENTS`) is more informative than a common one (e.g., `IMPORTS`).

**Key insight**: Start with a Bayesian uniform prior, then weight edges inversely by their frequency in the graph.

## Approach

### 1. Uniform Prior
Initially, all edge types are equally weighted (Bayesian uniform prior).

### 2. Frequency-Based Adjustment
After analyzing the entire graph:
- **Rare edges** → High weight (more informative)
- **Common edges** → Low weight (less informative)

### 3. Weight Formula

**Inverse Frequency (default):**
```
w(edge_type) = log(N / (count(edge_type) + α))
```

Where:
- `N` = total number of edges in graph
- `count(edge_type)` = frequency of this edge type
- `α` = Laplace smoothing (default = 1.0)

Weights are normalized to [0, 1].

**Softmax (alternative):**
```
w(edge_type) = softmax(inverse_frequency / temperature)
```

Temperature controls distribution shape:
- High temperature → more uniform weights
- Low temperature → more peaked weights

## Usage

### Basic Usage

```python
from service.parsers.edge_weights import compute_edge_weights

# Parse your code
parser = get_parser("python")
result = parser.parse(code, path="example.py")

# Compute weights from edge frequencies
weight_computer = compute_edge_weights(result.relations)

# Enrich edges with weights
enriched_edges = weight_computer.enrich_edges(result.relations)

# Each edge now has:
# - weight: inverse frequency weight [0, 1]
# - frequency: normalized frequency [0, 1]
```

### Example Output

```python
# Before:
{
    "type": "IMPORTS",
    "source": "main.py",
    "target": "os"
}

# After enrichment:
{
    "type": "IMPORTS",
    "source": "main.py",
    "target": "os",
    "weight": 0.3,      # Common edge type → low weight
    "frequency": 0.45   # 45% of all edges are IMPORTS
}

# Rare edge example:
{
    "type": "IMPLEMENTS",
    "source": "MyClass",
    "target": "Protocol",
    "weight": 0.95,     # Rare edge type → high weight
    "frequency": 0.02   # Only 2% of edges are IMPLEMENTS
}
```

### Statistics

```python
stats = weight_computer.get_statistics()
print(stats)

# Output:
{
    "total_edges": 1000,
    "num_edge_types": 15,
    "most_common": [
        ("IMPORTS", 450),
        ("CALLS", 320),
        ("USES", 180)
    ],
    "least_common": [
        ("IMPLEMENTS", 5),
        ("OVERRIDES", 8),
        ("DECORATES", 12)
    ],
    "entropy": 2.34,  # Shannon entropy in bits
    "weights": {
        "IMPLEMENTS": 0.95,
        "OVERRIDES": 0.89,
        "DECORATES": 0.82,
        # ... sorted by weight
        "CALLS": 0.42,
        "IMPORTS": 0.30
    }
}
```

### Softmax Alternative

```python
# For more peaked distribution (emphasize rare edges more)
weight_computer = compute_edge_weights(
    relations,
    method="softmax",
    temperature=0.5  # Lower = more peaked
)

# For more uniform distribution
weight_computer = compute_edge_weights(
    relations,
    method="softmax",
    temperature=2.0  # Higher = more uniform
)
```

## Integration with Neo4j

### Storing Weights

Weights are stored as edge properties and can be queried efficiently:

```cypher
// Create edge with weight
CREATE (a)-[:CALLS {weight: 0.85, frequency: 0.15}]->(b)

// Query by weight threshold
MATCH (a)-[r:CALLS]->(b)
WHERE r.weight > 0.7
RETURN a, r, b

// Weighted shortest path
MATCH path = shortestPath((a)-[*]-(b))
WHERE a.name = 'main' AND b.name = 'utils'
RETURN path,
       reduce(w = 0, r in relationships(path) | w + r.weight) AS total_weight
ORDER BY total_weight DESC
```

### Weighted PageRank

```cypher
// Find important nodes weighted by edge information content
CALL gds.pageRank.stream({
  nodeProjection: 'function',
  relationshipProjection: {
    CALLS: {
      properties: 'weight'
    }
  },
  relationshipWeightProperty: 'weight'
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS function, score
ORDER BY score DESC
LIMIT 10
```

### Weighted Graph Traversal

```cypher
// Find high-information paths
MATCH path = (start:function {name: 'main'})-[*1..5]->(end:function)
WHERE ALL(r in relationships(path) WHERE r.weight > 0.6)
WITH path,
     reduce(w = 1.0, r in relationships(path) | w * r.weight) AS path_weight
ORDER BY path_weight DESC
LIMIT 10
RETURN path, path_weight
```

## Practical Benefits

### 1. Better Semantic Search
Focus on rare, informative relationships:
```cypher
MATCH (c:class)-[r:IMPLEMENTS]->(p)
WHERE r.weight > 0.8  // High-information edges only
RETURN c, p
```

### 2. Dependency Analysis
Weight critical dependencies higher:
```cypher
MATCH (a)-[r]->(b)
WHERE r.weight > 0.7 AND r.type IN ['EXTENDS', 'IMPLEMENTS', 'OVERRIDES']
RETURN a.name, type(r), b.name, r.weight
ORDER BY r.weight DESC
```

### 3. Code Similarity
Find similar functions based on weighted edge patterns:
```cypher
MATCH (f1:function)-[r1]->(target)<-[r2]-(f2:function)
WHERE f1.id < f2.id
WITH f1, f2, avg(r1.weight + r2.weight) AS similarity
WHERE similarity > 1.2
RETURN f1.name, f2.name, similarity
ORDER BY similarity DESC
```

### 4. Anomaly Detection
Find unusual patterns (rare edge combinations):
```cypher
MATCH (n)-[r]->(m)
WHERE r.weight > 0.9  // Rare relationship
RETURN n.name, type(r), m.name, r.weight, r.frequency
```

## Comparison with RAG

Traditional RAG systems treat all context equally. Weighted knowledge graphs provide:

1. **Selective attention**: Focus on high-information relationships
2. **Structured reasoning**: Follow typed edges with semantic meaning
3. **Quantifiable relevance**: Compare paths by cumulative weight
4. **Efficient retrieval**: Index and query by edge weights

## Future Extensions

### Local Edge Metrics
Beyond global frequency, add local context:
- **Reference count**: How often this specific edge is traversed
- **Co-occurrence**: Weight edges that appear together
- **Temporal locality**: Weight recent code changes higher

### Contextual Weights
Adjust weights based on query context:
```python
# Higher weight for OOP relationships when analyzing classes
context_weights = {
    "EXTENDS": 1.2,
    "IMPLEMENTS": 1.2,
    "OVERRIDES": 1.1
}
```

### Multi-hop Information
Propagate information through graph:
```
I(path) = ∏ w(edge_i) for edge_i in path
```

Shorter, high-weight paths carry more information than longer paths.
