import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

interface Route {
  method: string;
  path: string;
  summary?: string;
  tags?: string[];
}

interface DocsPaneProps {
  routes: Route[];
  selectedRoute?: Route;
  specFile?: string;
  isActive: boolean;
  onRouteSelect?: (route: Route) => void;
  onRefresh?: () => void;
  onOpenSpec?: () => void;
}

/**
 * Get method color
 */
export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'green';
    case 'POST':
      return 'yellow';
    case 'PUT':
      return 'blue';
    case 'PATCH':
      return 'cyan';
    case 'DELETE':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Format method for display (fixed width)
 */
export function formatMethod(method: string): string {
  return method.toUpperCase().padEnd(7);
}

/**
 * Group routes by tag
 */
export function groupByTag(routes: Route[]): Record<string, Route[]> {
  const groups: Record<string, Route[]> = {};

  for (const route of routes) {
    const tag = route.tags?.[0] || 'default';
    if (!groups[tag]) {
      groups[tag] = [];
    }
    groups[tag].push(route);
  }

  return groups;
}

/**
 * Count routes by method
 */
export function countByMethod(routes: Route[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const route of routes) {
    const method = route.method.toUpperCase();
    counts[method] = (counts[method] || 0) + 1;
  }

  return counts;
}

function RouteList({
  routes,
  selectedRoute,
  onSelect,
}: {
  routes: Route[];
  selectedRoute?: Route;
  onSelect: (route: Route) => void;
}) {
  return (
    <Box flexDirection="column">
      {routes.slice(0, 10).map((route, idx) => {
        const isSelected = selectedRoute?.path === route.path &&
                          selectedRoute?.method === route.method;

        return (
          <Box key={`${route.method}-${route.path}`}>
            <Text
              color={getMethodColor(route.method)}
              bold={isSelected}
            >
              {formatMethod(route.method)}
            </Text>
            <Text
              dimColor={!isSelected}
              bold={isSelected}
              underline={isSelected}
            >
              {route.path}
            </Text>
          </Box>
        );
      })}
      {routes.length > 10 && (
        <Text dimColor>... and {routes.length - 10} more</Text>
      )}
    </Box>
  );
}

function RouteDetails({ route }: { route: Route }) {
  return (
    <Box flexDirection="column" marginTop={1} borderStyle="single" paddingX={1}>
      <Box>
        <Text color={getMethodColor(route.method)} bold>
          {route.method.toUpperCase()}
        </Text>
        <Text bold> {route.path}</Text>
      </Box>

      {route.summary && (
        <Box marginTop={1}>
          <Text dimColor>Summary: </Text>
          <Text>{route.summary}</Text>
        </Box>
      )}

      {route.tags && route.tags.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>Tags: </Text>
          <Text>{route.tags.join(', ')}</Text>
        </Box>
      )}
    </Box>
  );
}

function MethodSummary({ routes }: { routes: Route[] }) {
  const counts = countByMethod(routes);
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  return (
    <Box flexDirection="row" gap={2}>
      {methods.map(method => {
        const count = counts[method] || 0;
        if (count === 0) return null;

        return (
          <Box key={method}>
            <Text color={getMethodColor(method)}>{method}</Text>
            <Text dimColor>: {count}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

export function DocsPane({
  routes,
  selectedRoute,
  specFile,
  isActive,
  onRouteSelect,
  onRefresh,
  onOpenSpec,
}: DocsPaneProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Navigation
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
        if (routes[selectedIndex - 1]) {
          onRouteSelect?.(routes[selectedIndex - 1]);
        }
      }
      if (key.downArrow) {
        setSelectedIndex(Math.min(routes.length - 1, selectedIndex + 1));
        if (routes[selectedIndex + 1]) {
          onRouteSelect?.(routes[selectedIndex + 1]);
        }
      }

      // Actions
      if (input === 'r') {
        onRefresh?.();
      }
      if (input === 'o') {
        onOpenSpec?.();
      }
      if (input === 'v') {
        setViewMode(viewMode === 'list' ? 'grouped' : 'list');
      }
    },
    { isActive }
  );

  if (routes.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>API Documentation</Text>
        <Box marginTop={1}>
          <Text color="yellow">No routes documented</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:docs to generate documentation</Text>
        </Box>
      </Box>
    );
  }

  const grouped = groupByTag(routes);

  return (
    <Box padding={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>API Documentation </Text>
        <Text dimColor>({routes.length} endpoints)</Text>
      </Box>

      <MethodSummary routes={routes} />

      {specFile && (
        <Box marginTop={1}>
          <Text dimColor>Spec: </Text>
          <Text color="cyan">{specFile}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        {viewMode === 'list' ? (
          <RouteList
            routes={routes}
            selectedRoute={selectedRoute || routes[selectedIndex]}
            onSelect={onRouteSelect || (() => {})}
          />
        ) : (
          <Box flexDirection="column">
            {Object.entries(grouped).map(([tag, tagRoutes]) => (
              <Box key={tag} flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">{tag}</Text>
                <RouteList
                  routes={tagRoutes}
                  selectedRoute={selectedRoute || routes[selectedIndex]}
                  onSelect={onRouteSelect || (() => {})}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {(selectedRoute || routes[selectedIndex]) && (
        <RouteDetails route={selectedRoute || routes[selectedIndex]} />
      )}

      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [↑↓] Navigate  [v] Toggle view  [r] Refresh  [o] Open spec
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default DocsPane;
