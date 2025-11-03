import { prisma } from './db';
import { logger } from './logger';

// Prisma schema in this repo may not declare enums for DMARC; define a
// local type that matches expected string values to avoid build errors
export type DmarcPolicy = 'none' | 'quarantine' | 'reject';

export interface DmarcState {
  policy: DmarcPolicy;
  pct: number;
  aspf: 'r' | 's';
  adkim: 'r' | 's';
}

export interface DmarcKPI {
  alignOk: boolean; // ≥98% aligned
  volumeOk: boolean; // ≥1000 messages
  failRate: number; // % failing
  totalMessages: number;
  alignedMessages: number;
}

/**
 * Calculate DMARC KPIs from aggregate reports (7-day window)
 */
export async function calculateDmarcKPIs(domain: string, orgId: string): Promise<DmarcKPI> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  interface DmarcReportLike {
    total?: number | null;
    aligned?: number | null;
    failing?: number | null;
  }

  let reports: DmarcReportLike[] = [];
  try {
    // Some environments may not have dmarcAggregateReport model; guard access
    function hasDmarcAggregateReport(client: typeof prisma): client is typeof prisma & { dmarcAggregateReport: { findMany: (opts: any) => Promise<DmarcReportLike[]> } } {
      return Object.prototype.hasOwnProperty.call(client, 'dmarcAggregateReport');
    }

    if (hasDmarcAggregateReport(prisma)) {
      reports = await prisma.dmarcAggregateReport.findMany({
        where: {
          orgId,
          domain,
          createdAt: { gte: since },
        },
      });
    }
  } catch (err) {
    logger.debug({ err }, 'DMARC KPI query failed, returning defaults');
    reports = [];
  }
  
  if (reports.length === 0) {
    return {
      alignOk: false,
      volumeOk: false,
      failRate: 0,
      totalMessages: 0,
      alignedMessages: 0,
    };
  }
  
  const totalMessages = reports.reduce((sum: number, r: DmarcReportLike) => sum + (Number(r.total || 0)), 0);
  const alignedMessages = reports.reduce((sum: number, r: DmarcReportLike) => sum + (Number(r.aligned || 0)), 0);
  const failingMessages = reports.reduce((sum: number, r: DmarcReportLike) => sum + (Number(r.failing || 0)), 0);
  
  const alignRate = totalMessages > 0 ? alignedMessages / totalMessages : 0;
  const failRate = totalMessages > 0 ? failingMessages / totalMessages : 0;
  
  return {
    alignOk: alignRate >= 0.98,
    volumeOk: totalMessages >= 1000,
    failRate,
    totalMessages,
    alignedMessages,
  };
}

/**
 * Determine next DMARC policy step (adaptive state machine)
 */
type DmarcCurrentLike = { policy: string; pct?: number; aspf?: string; adkim?: string };

export function getNextDmarcPolicy(
  current: DmarcCurrentLike,
  kpi: DmarcKPI
): DmarcState | null {
  // Don't advance if conditions not met
  if (!kpi.volumeOk || !kpi.alignOk) {
    logger.info({ current, kpi }, 'DMARC conditions not met for advancement');
    return null;
  }
  
  // Rollback if fail rate too high
  if (kpi.failRate > 0.05) {
    logger.warn({ current, kpi }, 'DMARC fail rate too high, rolling back');
    const safeCurrent: DmarcState = {
      policy: (current.policy as DmarcPolicy) || 'none',
      pct: typeof current.pct === 'number' ? current.pct : 100,
      aspf: (current.aspf as 'r' | 's') || 'r',
      adkim: (current.adkim as 'r' | 's') || 'r',
    };
    return rollbackDmarcPolicy(safeCurrent);
  }
  
  // State machine progression
  if (current.policy === 'none') {
    return {
      policy: 'quarantine',
      pct: 50,
      aspf: 's',
      adkim: 's',
    };
  }
  
  if (current.policy === 'quarantine' && (current.pct ?? 0) < 100) {
    return {
      policy: 'quarantine',
      pct: 100,
      aspf: 's',
      adkim: 's',
    };
  }
  
  if (current.policy === 'quarantine' && (current.pct ?? 0) === 100) {
    return {
      policy: 'reject',
      pct: 100,
      aspf: 's',
      adkim: 's',
    };
  }
  
  // Already at max enforcement
  return null;
}

/**
 * Rollback DMARC policy (safety mechanism)
 */
function rollbackDmarcPolicy(current: DmarcState): DmarcState | null {
  if (current.policy === 'reject') {
    return {
      policy: 'quarantine',
      pct: 100,
      aspf: 's',
      adkim: 's',
    };
  }
  
  if (current.policy === 'quarantine' && current.pct === 100) {
    return {
      policy: 'quarantine',
      pct: 50,
      aspf: 's',
      adkim: 's',
    };
  }
  
  if (current.policy === 'quarantine' && current.pct === 50) {
    return {
      policy: 'none',
      pct: 100,
      aspf: 'r',
      adkim: 'r',
    };
  }
  
  return null;
}

/**
 * Generate DMARC DNS record value
 */
export function generateDmarcRecord(config: {
  policy: DmarcPolicy;
  pct: number;
  aspf: 'r' | 's';
  adkim: 'r' | 's';
  ruaMailto?: string;
  ruaHttp?: string;
  rufMailto?: string;
}): string {
  const parts = [
    'v=DMARC1',
    `p=${config.policy}`,
  ];
  
  if (config.pct !== 100) {
    parts.push(`pct=${config.pct}`);
  }
  
  parts.push(`aspf=${config.aspf}`);
  parts.push(`adkim=${config.adkim}`);
  
  if (config.ruaMailto) {
    parts.push(`rua=mailto:${config.ruaMailto}`);
  }
  if (config.ruaHttp) {
    parts.push(`rua=${config.ruaHttp}`);
  }
  if (config.rufMailto) {
    parts.push(`ruf=mailto:${config.rufMailto}`);
  }
  
  parts.push('fo=1'); // Generate reports if any mechanism fails
  
  return parts.join('; ');
}

/**
 * Publish DMARC record via DNS provider
 */
export async function publishDmarcRecord(
  domainConfigId: string
): Promise<{ success: boolean; error?: string }> {
  const config = await prisma.domainConfig.findUnique({
    where: { id: domainConfigId },
  });
  
  if (!config) {
    return { success: false, error: 'Domain config not found' };
  }
  
  const record = generateDmarcRecord({
    policy: (config.dmarcPolicy as DmarcPolicy) || 'none',
    pct: config.dmarcPct,
    aspf: (config.aspf as 'r' | 's') || 'r',
    adkim: (config.adkim as 'r' | 's') || 'r',
    ruaMailto: config.ruaMailto || undefined,
    ruaHttp: (config as any)?.ruaHttp || undefined,
    rufMailto: (config as any)?.rufMailto || (config as any)?.ruf || undefined,
  });
  
  logger.info({ domain: config.domain, record }, 'Publishing DMARC record');
  
  // Route to appropriate DNS provider
    if (config.dnsProvider === 'route53') {
    const zoneRef = (config as any)?.dnsZoneRef || (config as any)?.dnsProviderZoneId || null;
    return publishToRoute53(config.domain, record, zoneRef);
  } else if (config.dnsProvider === 'cloudflare') {
    const zoneRef = (config as any)?.dnsZoneRef || (config as any)?.dnsProviderZoneId || null;
    return publishToCloudflare(config.domain, record, zoneRef);
  } else {
    // Manual mode - return instructions
    return {
      success: false,
      error: `Manual publication required. Add TXT record:\n_dmarc.${config.domain} = "${record}"`,
    };
  }
}

/**
 * Publish to AWS Route53
 */
async function publishToRoute53(
  domain: string,
  record: string,
  zoneId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { Route53Client, ChangeResourceRecordSetsCommand } = await import('@aws-sdk/client-route-53');
    
    const client = new Route53Client({
      region: process.env.ROUTE53_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.ROUTE53_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.ROUTE53_SECRET_ACCESS_KEY || '',
      },
    });
    
    if (!zoneId) {
      return { success: false, error: 'Route53 zone ID not configured' };
    }
    
    const command = new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: `_dmarc.${domain}`,
              Type: 'TXT',
              TTL: 3600,
              ResourceRecords: [{ Value: `"${record}"` }],
            },
          },
        ],
      },
    });
    
    await client.send(command);
    
    logger.info({ domain, provider: 'route53' }, 'DMARC record published');
    
    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, domain }, 'Route53 publication failed');
    return { success: false, error: errMsg };
  }
}

/**
 * Publish to Cloudflare
 */
async function publishToCloudflare(
  domain: string,
  record: string,
  zoneId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const cfZoneId = zoneId || process.env.CLOUDFLARE_ZONE_ID;
    
    if (!token || !cfZoneId) {
      return { success: false, error: 'Cloudflare credentials not configured' };
    }
    
    // First, check if record exists
    const listResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records?name=_dmarc.${domain}&type=TXT`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const listData = await listResponse.json();
    
    let method = 'POST';
    let url = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`;
    
    if (listData.result && listData.result.length > 0) {
      // Update existing record
      method = 'PUT';
      url = `${url}/${listData.result[0].id}`;
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'TXT',
        name: `_dmarc.${domain}`,
        content: record,
        ttl: 3600,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Unknown error');
    }
    
    logger.info({ domain, provider: 'cloudflare' }, 'DMARC record published');
    
    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, domain }, 'Cloudflare publication failed');
    return { success: false, error: errMsg };
  }
}

/**
 * Check if domain can be adjusted (safety checks)
 */
export async function canAdjustDmarc(domainConfigId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const config = await prisma.domainConfig.findUnique({
    where: { id: domainConfigId },
  });
  
  if (!config) {
    return { allowed: false, reason: 'Config not found' };
  }
  
  // Check if adjusted recently (max 1 change per day)
  // Normalize shape for optional fields that may vary between deployments
  const cfg = config as unknown as {
    lastPublishedAt?: string | Date | null;
    lastDmarcAdjustedAt?: string | Date | null;
    lastDnsCheckAt?: string | Date | null;
    ruaHttp?: string | null;
    rua?: string | null;
  };

  const lastPublished = cfg.lastPublishedAt || cfg.lastDmarcAdjustedAt || cfg.lastDnsCheckAt;
  if (lastPublished) {
    const hoursSince = (Date.now() - new Date(lastPublished).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      return {
        allowed: false,
        reason: `Dernière publication il y a ${hoursSince.toFixed(1)}h. Attendez 24h.`,
      };
    }
  }

  // Check if RUA configured
  if (!config.ruaMailto && !(cfg.ruaHttp || cfg.rua)) {
    return {
      allowed: false,
      reason: 'RUA (aggregate reports) non configuré',
    };
  }
  
  return { allowed: true };
}
