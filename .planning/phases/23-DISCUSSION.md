# Phase 23: Architecture Commands - Discussion

## Implementation Preferences

| Decision | Choice | Notes |
|----------|--------|-------|
| Graph library | None (custom) | Generate Mermaid text directly |
| Coupling metrics | Afferent/Efferent | Standard software metrics |
| Service detection | Heuristic | Clustering by imports + directories |
| Output format | Mermaid + JSON | Visual + machine-readable |

## Edge Cases to Handle

- [ ] Circular dependencies (detect and report)
- [ ] Monorepo with multiple apps
- [ ] Mixed languages (JS + Python)
- [ ] Dynamic imports
- [ ] Re-exports and barrel files

## Constraints

- Must work without running code (static analysis only)
- Should handle large codebases (1000+ files)
- Mermaid diagrams must be valid syntax

## Architecture Analysis Approach

1. **Dependency Graph**: Parse imports/requires to build file dependency graph
2. **Module Detection**: Group files by directory and shared imports
3. **Coupling Metrics**: Calculate afferent (incoming) and efferent (outgoing) coupling
4. **Cohesion Analysis**: Measure how related files in a module are
5. **Boundary Detection**: Identify natural service boundaries using clustering
6. **Circular Detection**: Find and report dependency cycles

## Microservice Conversion Approach

1. Analyze current monolith structure
2. Identify bounded contexts (user, auth, billing, etc.)
3. Generate service extraction plan
4. Create API contracts between services
5. Generate migration tests
