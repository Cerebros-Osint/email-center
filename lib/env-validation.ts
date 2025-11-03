/**
 * Environment variable validation
 * Run this at application startup to ensure all required vars are set
 */

export function validateEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
  ];

  const missing: string[] = [];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate ENCRYPTION_KEY format
  const encKey = process.env.ENCRYPTION_KEY;
  if (encKey && !/^[0-9a-fA-F]{64}$/.test(encKey)) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validate SESSION_SECRET length
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret && sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }

  console.log('✓ Environment variables validated successfully');
}

/**
 * Validate optional SMTP provider credentials
 */
export function validateSmtpProviders(): void {
  const warnings: string[] = [];

  // Check SES credentials
  if (process.env.SES_ACCESS_KEY_ID && !process.env.SES_SECRET_ACCESS_KEY) {
    warnings.push('SES_ACCESS_KEY_ID is set but SES_SECRET_ACCESS_KEY is missing');
  }

  // Check Titan credentials
  if (process.env.TITAN_USER && !process.env.TITAN_PASS) {
    warnings.push('TITAN_USER is set but TITAN_PASS is missing');
  }

  // Check Route53 credentials
  if (process.env.ROUTE53_ACCESS_KEY_ID && !process.env.ROUTE53_SECRET_ACCESS_KEY) {
    warnings.push('ROUTE53_ACCESS_KEY_ID is set but ROUTE53_SECRET_ACCESS_KEY is missing');
  }

  // Check Cloudflare credentials
  if (process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_ZONE_ID) {
    warnings.push('CLOUDFLARE_API_TOKEN is set but CLOUDFLARE_ZONE_ID is missing');
  }

  if (warnings.length > 0) {
    console.warn('⚠ SMTP provider configuration warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
}
