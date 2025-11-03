import dns from 'dns/promises';
import { redis } from './redis';
import { logger } from './logger';

const MX_CACHE_TTL = 60 * 60 * 48; // 48 hours

export interface MxRecord {
  exchange: string;
  priority: number;
}

export interface MxLookupResult {
  records: MxRecord[];
  hint: 'gmail' | 'outlook' | 'yahoo' | 'other';
  resolvedAt: Date;
}

/**
 * Resolve MX records for a domain with caching
 */
export async function getMx(domain: string): Promise<MxLookupResult> {
  try {
    // Check cache first
    const cacheKey = `mx:${domain.toLowerCase()}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      logger.debug({ domain, source: 'cache' }, 'MX lookup from cache');
      return {
        records: data.records,
        hint: data.hint,
        resolvedAt: new Date(data.resolvedAt),
      };
    }
    
    // Perform DNS lookup
    const records = await dns.resolveMx(domain);
    const hint = detectProvider(records);
    
    const result: MxLookupResult = {
      records: records.map(r => ({
        exchange: r.exchange,
        priority: r.priority,
      })),
      hint,
      resolvedAt: new Date(),
    };
    
    // Cache the result
    await redis.setex(
      cacheKey,
      MX_CACHE_TTL,
      JSON.stringify({
        records: result.records,
        hint: result.hint,
        resolvedAt: result.resolvedAt.toISOString(),
      })
    );
    
    logger.debug({ domain, hint, recordCount: records.length }, 'MX lookup from DNS');
    
    return result;
  } catch (error) {
    logger.error({ error, domain }, 'MX lookup failed');
    throw new Error(`MX lookup failed for ${domain}: ${error}`);
  }
}

/**
 * Detect email provider from MX records
 */
function detectProvider(records: MxRecord[]): 'gmail' | 'outlook' | 'yahoo' | 'other' {
  const exchanges = records.map(r => r.exchange.toLowerCase());
  
  // Gmail/Google Workspace
  if (exchanges.some(e => e.includes('google.com') || e.includes('googlemail.com'))) {
    return 'gmail';
  }
  
  // Outlook/Office 365
  if (
    exchanges.some(
      e => e.includes('outlook.com') || e.includes('protection.outlook.com') || e.includes('mail.protection.outlook.com')
    )
  ) {
    return 'outlook';
  }
  
  // Yahoo
  if (exchanges.some(e => e.includes('yahoodns.net') || e.includes('yahoo.com'))) {
    return 'yahoo';
  }
  
  return 'other';
}

/**
 * Check SPF record for a domain
 */
export async function checkSpf(domain: string): Promise<{
  exists: boolean;
  record?: string;
}> {
  try {
    const records = await dns.resolveTxt(domain);
    const spfRecord = records.find(r => r[0]?.startsWith('v=spf1'));
    
    return {
      exists: !!spfRecord,
      record: spfRecord?.[0],
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Check DKIM record for a domain and selector
 */
export async function checkDkim(domain: string, selector: string): Promise<{
  exists: boolean;
  record?: string;
}> {
  try {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    const records = await dns.resolveTxt(dkimDomain);
    const dkimRecord = records.find(r => r[0]?.includes('v=DKIM1'));
    
    return {
      exists: !!dkimRecord,
      record: dkimRecord?.[0],
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Check DMARC record for a domain
 */
export async function checkDmarc(domain: string): Promise<{
  exists: boolean;
  record?: string;
  policy?: string;
}> {
  try {
    const dmarcDomain = `_dmarc.${domain}`;
    const records = await dns.resolveTxt(dmarcDomain);
    const dmarcRecord = records.find(r => r[0]?.startsWith('v=DMARC1'));
    
    let policy: string | undefined;
    if (dmarcRecord) {
      const match = dmarcRecord[0].match(/p=(\w+)/);
      policy = match?.[1];
    }
    
    return {
      exists: !!dmarcRecord,
      record: dmarcRecord?.[0],
      policy,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Verify all DNS records for a domain
 */
export async function verifyDnsRecords(domain: string, dkimSelector?: string) {
  const [spf, dkim, dmarc, mx] = await Promise.all([
    checkSpf(domain),
    dkimSelector ? checkDkim(domain, dkimSelector) : Promise.resolve({ exists: false }),
    checkDmarc(domain),
    getMx(domain).catch(() => null),
  ]);
  
  return {
    domain,
    spf,
    dkim,
    dmarc,
    mx: mx ? { exists: true, records: mx.records } : { exists: false },
  };
}
