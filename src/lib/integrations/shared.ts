export interface IntegrationAdapterStatus {
  name: string;
  enabled: boolean;
  reason?: string;
}

export interface IntegrationResult<TData> {
  data: TData | null;
  source: string;
  fetchedAt: string;
  warnings?: string[];
}
