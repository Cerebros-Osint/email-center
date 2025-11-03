import { Counter, Gauge, Histogram, register } from 'prom-client';

// Counters
export const emailsSentTotal = new Counter({
  name: 'emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['org_id', 'provider', 'mx_hint', 'result'],
});

export const emailsReceivedTotal = new Counter({
  name: 'emails_received_total',
  help: 'Total emails received',
  labelNames: ['org_id'],
});

export const suppressionsTotal = new Counter({
  name: 'suppressions_total',
  help: 'Total email suppressions',
  labelNames: ['org_id', 'reason'],
});

export const unsubscribesTotal = new Counter({
  name: 'unsubscribes_total',
  help: 'Total unsubscribes',
  labelNames: ['org_id', 'method'],
});

export const dmarcPolicyChanges = new Counter({
  name: 'dmarc_policy_changes_total',
  help: 'Total DMARC policy changes',
  labelNames: ['org_id', 'domain', 'from_policy', 'to_policy'],
});

// Gauges
export const activeSmtpAccounts = new Gauge({
  name: 'active_smtp_accounts',
  help: 'Number of active SMTP accounts',
  labelNames: ['org_id', 'provider'],
});

export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name'],
});

export const rateLimitUsage = new Gauge({
  name: 'rate_limit_usage',
  help: 'Current rate limit usage (0-1)',
  labelNames: ['org_id', 'smtp_account_id'],
});

// Histograms
export const smtpLatency = new Histogram({
  name: 'smtp_latency_seconds',
  help: 'SMTP send latency',
  labelNames: ['smtp_account_id', 'provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const preflightDuration = new Histogram({
  name: 'preflight_duration_seconds',
  help: 'Preflight check duration',
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const mxLookupDuration = new Histogram({
  name: 'mx_lookup_duration_seconds',
  help: 'MX lookup duration',
  buckets: [0.05, 0.1, 0.5, 1, 2],
});

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics(): void {
  register.clear();
}
