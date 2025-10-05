# Cypher Query Examples with Edge Weights

Practical examples of using weighted edges for better code analysis.

## Basic Queries

### 1. Find High-Information Edges

```cypher
// Find rare, informative relationships
MATCH (a)-[r]->(b)
WHERE r.weight > 0.8
RETURN a.name, type(r), b.name, r.weight, r.frequency
ORDER BY r.weight DESC
LIMIT 20
```

### 2. Filter by Edge Importance

```cypher
// Only traverse important relationships
MATCH path = (start:function {name: 'main'})-[r*1..5]->(end)
WHERE ALL(rel IN relationships(path) WHERE rel.weight > 0.6)
RETURN path
LIMIT 10
```

### 3. Compare Edge Distributions

```cypher
// Analyze edge weight distribution by type
MATCH ()-[r]->()
RETURN type(r) AS edge_type,
       count(r) AS count,
       avg(r.weight) AS avg_weight,
       avg(r.frequency) AS avg_frequency
ORDER BY avg_weight DESC
```

## Path Analysis

### 4. Weighted Shortest Path

```cypher
// Find paths with highest cumulative information
MATCH path = shortestPath((a:function {name: 'parse'})-[*]-(b:function {name: 'execute'}))
WITH path,
     reduce(w = 0, r IN relationships(path) | w + r.weight) AS total_weight,
     length(path) AS path_length
RETURN path, total_weight, path_length
ORDER BY total_weight DESC
LIMIT 5
```

### 5. High-Quality Paths Only

```cypher
// Find paths where ALL edges are high-weight
MATCH path = (a:function)-[*2..5]->(b:function)
WHERE a.name = 'main'
  AND ALL(r IN relationships(path) WHERE r.weight > 0.7)
WITH path,
     reduce(w = 1.0, r IN relationships(path) | w * r.weight) AS path_quality
WHERE path_quality > 0.5
RETURN path, path_quality
ORDER BY path_quality DESC
LIMIT 10
```

### 6. Information Flow Analysis

```cypher
// Track information flow from source to consumers
MATCH path = (source:function {name: 'configure'})-[r:CALLS*1..3]->(consumer)
WITH path,
     reduce(info = 1.0, rel IN relationships(path) | info * rel.weight) AS information_flow
WHERE information_flow > 0.3
RETURN consumer.name, information_flow, length(path) AS hops
ORDER BY information_flow DESC
```

## Dependency Analysis

### 7. Critical Dependencies

```cypher
// Find structural dependencies (EXTENDS, IMPLEMENTS)
MATCH (a:class)-[r]->(b)
WHERE type(r) IN ['EXTENDS', 'IMPLEMENTS']
  AND r.weight > 0.7
RETURN a.name, type(r), b.name, r.weight,
       r.frequency * 100 AS percent_of_edges
ORDER BY r.weight DESC
```

### 8. Weighted Dependency Graph

```cypher
// Build weighted dependency subgraph
MATCH (a)-[r:IMPORTS|CALLS]->(b)
WHERE r.weight > 0.5
WITH a, b, sum(r.weight) AS total_weight
RETURN a.name AS from,
       b.name AS to,
       total_weight,
       total_weight > 2.0 AS is_critical
ORDER BY total_weight DESC
```

### 9. Transitive Dependencies with Decay

```cypher
// Weight decreases with distance (information decay)
MATCH path = (a:function {name: 'main'})-[*1..4]->(dependency)
WITH dependency,
     reduce(w = 1.0, r IN relationships(path) | w * r.weight * 0.9) AS decayed_weight
WHERE decayed_weight > 0.2
RETURN dependency.name, decayed_weight
ORDER BY decayed_weight DESC
```

## Code Similarity

### 10. Similar Functions by Edge Patterns

```cypher
// Find functions with similar outgoing edges (weighted)
MATCH (f1:function)-[r1]->(target)<-[r2]-(f2:function)
WHERE f1.id < f2.id  // Avoid duplicates
WITH f1, f2,
     count(target) AS shared_targets,
     avg(r1.weight + r2.weight) / 2 AS avg_edge_weight
WHERE shared_targets >= 3
  AND avg_edge_weight > 0.6
RETURN f1.name, f2.name, shared_targets, avg_edge_weight
ORDER BY avg_edge_weight DESC, shared_targets DESC
LIMIT 20
```

### 11. Structural Similarity

```cypher
// Compare classes by weighted inheritance/implementation patterns
MATCH (c1:class)-[r1:EXTENDS|IMPLEMENTS]->(interface)
MATCH (c2:class)-[r2:EXTENDS|IMPLEMENTS]->(interface)
WHERE c1.id < c2.id
WITH c1, c2,
     collect({interface: interface.name, weight: (r1.weight + r2.weight) / 2}) AS shared_patterns
WHERE size(shared_patterns) >= 2
RETURN c1.name, c2.name, shared_patterns
ORDER BY size(shared_patterns) DESC
```

## Anomaly Detection

### 12. Unusual Patterns

```cypher
// Find rare edge combinations (potential design patterns or anomalies)
MATCH (a)-[r1]->(b)-[r2]->(c)
WHERE r1.weight > 0.85 AND r2.weight > 0.85
RETURN a.name, type(r1), b.name, type(r2), c.name,
       r1.weight, r2.weight
ORDER BY r1.weight + r2.weight DESC
LIMIT 10
```

### 13. Over-coupled Nodes

```cypher
// Find nodes with many high-weight incoming edges (design smell)
MATCH (target)<-[r]-(source)
WHERE r.weight > 0.7
WITH target, count(r) AS high_weight_refs, avg(r.weight) AS avg_weight
WHERE high_weight_refs > 10
RETURN target.name, high_weight_refs, avg_weight
ORDER BY high_weight_refs DESC
```

## Centrality with Weights

### 14. Weighted PageRank

```cypher
// Run PageRank with edge weights
CALL gds.graph.project(
  'codeGraph',
  'function',
  {
    CALLS: {
      properties: 'weight'
    }
  }
)

CALL gds.pageRank.stream('codeGraph', {
  relationshipWeightProperty: 'weight'
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS function, score
ORDER BY score DESC
LIMIT 20
```

### 15. Weighted Betweenness Centrality

```cypher
// Find important functions in information flow
CALL gds.betweenness.stream('codeGraph', {
  relationshipWeightProperty: 'weight'
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS function, score
ORDER BY score DESC
LIMIT 20
```

## Contextual Weighting

### 16. Dynamic Weight Adjustment

```cypher
// Boost weights for specific edge types based on context
MATCH (a)-[r]->(b)
WITH a, r, b,
     CASE type(r)
       WHEN 'EXTENDS' THEN r.weight * 1.5
       WHEN 'IMPLEMENTS' THEN r.weight * 1.5
       WHEN 'OVERRIDES' THEN r.weight * 1.3
       ELSE r.weight
     END AS boosted_weight
WHERE boosted_weight > 0.7
RETURN a.name, type(r), b.name, r.weight AS original, boosted_weight
ORDER BY boosted_weight DESC
```

### 17. Combined Metrics

```cypher
// Combine multiple weight factors
MATCH (a)-[r:CALLS]->(b)
WITH a, r, b,
     r.weight AS structural_weight,
     1.0 / (1.0 + r.frequency * 10) AS rarity_bonus,
     CASE WHEN a.language = b.language THEN 1.0 ELSE 0.7 END AS language_bonus
WITH a, r, b,
     structural_weight * rarity_bonus * language_bonus AS combined_score
WHERE combined_score > 0.6
RETURN a.name, b.name, combined_score
ORDER BY combined_score DESC
LIMIT 20
```

## Impact Analysis

### 18. Change Impact Estimation

```cypher
// Estimate impact of changing a function (weighted by edge importance)
MATCH (f:function {name: 'config_parser'})-[r1:CALLS*0..1]->(direct)
OPTIONAL MATCH (direct)-[r2:CALLS|USES]->(indirect)
WITH f, direct, indirect,
     reduce(w = 1.0, r IN r1 | w * r.weight) AS direct_impact,
     reduce(w = 1.0, r IN r2 | w * r.weight * 0.5) AS indirect_impact
RETURN
  f.name AS changed_function,
  count(DISTINCT direct) AS direct_dependents,
  count(DISTINCT indirect) AS indirect_dependents,
  sum(direct_impact) AS total_direct_impact,
  sum(indirect_impact) AS total_indirect_impact
```

### 19. Risk Assessment

```cypher
// Assess risk of breaking changes
MATCH (critical:function)-[r:CALLS]->(target:function {name: 'parse_input'})
WHERE r.weight > 0.7
WITH critical, r
MATCH (critical)<-[incoming*0..2]-(consumer)
WITH target, critical, r, count(DISTINCT consumer) AS reach
RETURN
  target.name AS target_function,
  count(critical) AS critical_callers,
  sum(reach) AS estimated_reach,
  avg(r.weight) AS avg_importance
ORDER BY critical_callers DESC, avg_importance DESC
```

## Optimization Queries

### 20. High-Value Refactoring Targets

```cypher
// Find functions that would benefit most from refactoring
// (many high-weight incoming edges = high coupling)
MATCH (f:function)<-[r]-(caller)
WHERE r.weight > 0.6
WITH f,
     count(r) AS coupling_count,
     avg(r.weight) AS avg_coupling_weight,
     collect(DISTINCT type(r)) AS edge_types
WHERE coupling_count > 5
RETURN f.name,
       coupling_count,
       avg_coupling_weight,
       edge_types,
       coupling_count * avg_coupling_weight AS refactor_priority
ORDER BY refactor_priority DESC
LIMIT 10
```

## Tips for Using Weights

1. **Threshold Selection**: Start with `weight > 0.7` for high-information edges, adjust based on your codebase

2. **Multiplicative vs Additive**:
   - Use multiplication for path quality: `reduce(w = 1.0, r IN rels | w * r.weight)`
   - Use addition for path importance: `reduce(w = 0, r IN rels | w + r.weight)`

3. **Information Decay**: Apply decay factors for transitive relationships: `w * r.weight * 0.9^distance`

4. **Context-Specific Boosts**: Multiply weights by context factors for domain-specific queries

5. **Combine with Graph Algorithms**: Use weights with GDS library for more accurate centrality measures
