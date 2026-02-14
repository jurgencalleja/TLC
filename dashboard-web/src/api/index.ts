export { createApiClient, apiClient, ApiError } from './client';
export type { ApiClient, ApiClientOptions, RequestOptions } from './client';

export { createApiEndpoints } from './endpoints';
export type {
  ApiEndpoints,
  Agent,
  HealthStatus,
  CommandResult,
  CommandHistoryEntry,
  RoadmapPhase,
  RoadmapMilestone,
  RoadmapData,
  TestInventoryGroup,
  TestInventoryData,
} from './endpoints';

import { apiClient } from './client';
import { createApiEndpoints } from './endpoints';

export const api = createApiEndpoints(apiClient);
