import { prisma } from './db';
import { generateDkimKeyPair } from './crypto';
import { logger } from './logger';
// uuid not needed here

/**
 * Generate new DKIM selector and key pair
 */
export async function generateDkimRotation(domainConfigId: string): Promise<{
  selector: string;
  publicKey: string;
  privateKey: string;
}> {
  const config = await prisma.domainConfig.findUnique({
    where: { id: domainConfigId },
  });
  
  if (!config) {
    throw new Error('Domain config not found');
  }
  
  // Generate new selector (timestamp-based)
  const timestamp = Date.now().toString(36);
  const selector = `dkim${timestamp}`;
  
  // Generate key pair
  const keyPair = await generateDkimKeyPair();
  
  logger.info(
    { domain: config.domain, selector },
    'DKIM rotation generated'
  );
  
  return {
    selector,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Plan DKIM rotation (set next selector, schedule rotation)
 */
export async function planDkimRotation(domainConfigId: string): Promise<{
  success: boolean;
  selector: string;
  publicKey: string;
  dnsRecord: string;
  rotateAt: Date;
}> {
  const rotation = await generateDkimRotation(domainConfigId);
  
  // Schedule rotation for 7 days from now (allows DNS propagation)
  const rotateAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Update domain config
  await prisma.domainConfig.update({
    where: { id: domainConfigId },
    data: {
      dkimSelectorNext: rotation.selector,
      dkimRotateAt: rotateAt,
    },
  });
  const dnsRecord = formatDkimDnsRecord(rotation.publicKey);
  
  logger.info(
    { domainConfigId, selector: rotation.selector, rotateAt },
    'DKIM rotation planned'
  );
  
  return {
    success: true,
    selector: rotation.selector,
    publicKey: rotation.publicKey,
    dnsRecord,
    rotateAt,
  };
}

/**
 * Execute DKIM rotation (switch to next selector)
 */
export async function executeDkimRotation(domainConfigId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const config = await prisma.domainConfig.findUnique({
    where: { id: domainConfigId },
  });
  
  if (!config) {
    return { success: false, error: 'Config not found' };
  }
  
  if (!config.dkimSelectorNext) {
    return { success: false, error: 'No next selector configured' };
  }
  
  // Verify DNS propagation (check if new DKIM record exists)
  const { checkDkim } = await import('./dns');
  const check = await checkDkim(config.domain, config.dkimSelectorNext);
  
  if (!check.exists) {
    return {
      success: false,
      error: 'DKIM DNS record not yet propagated',
    };
  }
  
  // Switch selectors
  await prisma.domainConfig.update({
    where: { id: domainConfigId },
    data: {
      dkimSelectorCurrent: config.dkimSelectorNext,
      dkimSelectorNext: null,
      dkimRotateAt: null,
    },
  });
  
  logger.info(
    { domain: config.domain, newSelector: config.dkimSelectorNext },
    'DKIM rotation executed'
  );
  
  return { success: true };
}

/**
 * Format DKIM public key for DNS TXT record
 */
function formatDkimDnsRecord(publicKey: string): string {
  // DKIM record format: v=DKIM1; k=rsa; p=<base64-public-key>
  return `v=DKIM1; k=ed25519; p=${publicKey}`;
}

/**
 * Get DKIM rotation status
 */
export async function getDkimRotationStatus(domainConfigId: string) {
  const config = await prisma.domainConfig.findUnique({
    where: { id: domainConfigId },
  });
  
  if (!config) {
    return null;
  }
  
  return {
    currentSelector: config.dkimSelectorCurrent,
    nextSelector: config.dkimSelectorNext,
    rotateAt: config.dkimRotateAt,
    isPending: !!config.dkimSelectorNext,
    canExecute: config.dkimRotateAt ? config.dkimRotateAt <= new Date() : false,
  };
}
