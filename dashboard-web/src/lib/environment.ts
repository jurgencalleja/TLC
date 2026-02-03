export type TlcMode = 'local' | 'vps' | 'staging' | 'production';

export interface EnvironmentConfig {
  mode: TlcMode;
  apiBaseUrl: string;
  wsUrl: string;
  features: {
    teamPresence: boolean;
    activityFeed: boolean;
    realTimeUpdates: boolean;
    notifications: boolean;
    deployments: boolean;
  };
}

/**
 * Detect the current environment mode
 */
export function detectEnvironment(): TlcMode {
  // Check explicit env var first
  const mode = import.meta.env.VITE_TLC_MODE;
  if (mode && ['local', 'vps', 'staging', 'production'].includes(mode)) {
    return mode as TlcMode;
  }

  // Auto-detect from hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local';
    }
    if (hostname.includes('staging')) {
      return 'staging';
    }
  }

  return 'local';
}

/**
 * Get full environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const mode = detectEnvironment();

  const featuresByMode: Record<TlcMode, EnvironmentConfig['features']> = {
    local: {
      teamPresence: false,
      activityFeed: false,
      realTimeUpdates: true,
      notifications: true,
      deployments: false,
    },
    vps: {
      teamPresence: true,
      activityFeed: true,
      realTimeUpdates: true,
      notifications: true,
      deployments: true,
    },
    staging: {
      teamPresence: true,
      activityFeed: true,
      realTimeUpdates: true,
      notifications: true,
      deployments: true,
    },
    production: {
      teamPresence: true,
      activityFeed: true,
      realTimeUpdates: true,
      notifications: true,
      deployments: true,
    },
  };

  return {
    mode,
    apiBaseUrl: getApiBaseUrl(),
    wsUrl: getWebSocketUrl(),
    features: featuresByMode[mode],
  };
}

/**
 * Check if running in local mode
 */
export function isLocalMode(): boolean {
  return detectEnvironment() === 'local';
}

/**
 * Check if running in VPS mode (team features enabled)
 */
export function isVpsMode(): boolean {
  return detectEnvironment() === 'vps';
}

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  // Custom URL takes precedence
  const customUrl = import.meta.env?.VITE_API_URL;
  if (customUrl) {
    return customUrl;
  }

  const mode = detectEnvironment();

  // Production uses relative URL (same origin)
  if (mode === 'production' || mode === 'staging') {
    return '/api';
  }

  // Local/VPS uses localhost
  const port = import.meta.env?.VITE_API_PORT || '3147';
  return `http://localhost:${port}/api`;
}

/**
 * Get the WebSocket URL
 */
export function getWebSocketUrl(): string {
  // Custom URL takes precedence
  const customUrl = import.meta.env?.VITE_WS_URL;
  if (customUrl) {
    return customUrl;
  }

  const mode = detectEnvironment();

  // Production/staging uses wss://
  if (mode === 'production' || mode === 'staging') {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws`;
    }
    return 'wss://localhost/ws';
  }

  // Local/VPS uses ws://
  const port = import.meta.env?.VITE_WS_PORT || '3147';
  return `ws://localhost:${port}/ws`;
}
