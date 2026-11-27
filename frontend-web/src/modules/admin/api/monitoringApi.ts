import { api } from '../../core/api/api';
import type { AdminPage, AdminPageParams } from './adminApi';

export type OperationService = 'ai' | 'ocr';
export type Period = { from: string; to: string };
type Scalar = string | number | boolean | null;
export type MetricRow = Record<string, Scalar>;
export type MonitoringSummary = {
  firstObservedAt: string | null;
  todayRequests: number;
  aggregate: MetricRow;
  operations: MetricRow[];
  trend: MetricRow[];
  errors: MetricRow[];
  providers?: MetricRow[];
  providerErrors?: MetricRow[];
  tools?: MetricRow[];
  responses?: MetricRow[];
  actions?: MetricRow;
  actionExecution?: MetricRow[];
  health?: ServiceHealth;
};
export type ServiceStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'DISABLED' | 'NOT_CONFIGURED' | 'UNKNOWN';
export type ServiceHealth = {
  status: ServiceStatus;
  checkedAt: string;
  stale: boolean;
  cacheHit: boolean;
  services: {
    name: string;
    status: ServiceStatus;
    latencyMs: number | null;
    checkedAt: string;
    lastSuccessAt: string | null;
    errorCode: string | null;
    scope: string;
  }[];
};
type RequestParams = AdminPageParams & Period & {
  outcome?: string;
  operation?: string;
  model?: string;
  error?: string;
};
type DashboardMetrics = {
  health: ServiceHealth;
  finai_requests: number;
  finai_error_rate: number | null;
  ocr_requests: number;
  ocr_error_rate: number | null;
  open_feedback: number;
};
const base = '/admin/monitoring';
const requests = (service: OperationService) => async (params: RequestParams, signal?: AbortSignal) =>
  (await api.get<AdminPage<MetricRow>>(`${base}/${service}/requests`, { params, signal })).data;

export const monitoringApi = {
  summary: async (service: OperationService, params: Period, signal: AbortSignal) =>
    (await api.get<MonitoringSummary>(`${base}/${service}/summary`, { params, signal })).data,
  aiRequests: requests('ai'),
  ocrRequests: requests('ocr'),
  dashboard: async (signal: AbortSignal) =>
    (await api.get<DashboardMetrics>(`${base}/dashboard`, { signal })).data,
};
