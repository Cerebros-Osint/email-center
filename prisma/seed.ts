import { PrismaClient } from '@prisma/client';
import { hashPassword, encrypt } from '../lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create organization
  const org = await prisma.org.upsert({
    where: { id: 'seed-org-1' },
    update: {},
    create: {
      id: 'seed-org-1',
      name: 'Acme Corporation',
    },
  });
  
  console.log('✅ Organization created:', org.name);
  
  // Create default admin user
  const passwordHash = await hashPassword('Pass456@');
  const user = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: { passwordHash }, // Update password if user exists
    create: {
      email: 'admin@acme.com',
      passwordHash,
    },
  });
  
  console.log('✅ User created:', user.email);
  
  // Link user to org
  await prisma.orgUser.upsert({
    where: {
      orgId_userId: {
        orgId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      orgId: org.id,
      userId: user.id,
      role: 'Owner',
    },
  });
  
  console.log('✅ User linked to org');
  
  // Create org settings
  await prisma.orgSettings.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      killSwitch: false,
      rateLimitPerMin: 300,
      rateLimitPerDay: 10000,
      retentionDaysRawSource: 60,
      listUnsubscribeEnabled: true,
    },
  });
  
  console.log('✅ Org settings created');
  
  // Create SMTP accounts (demo - configure with real credentials in production)
  // Get credentials from environment or use demo values
  const sesUsername = process.env.SEED_SES_USERNAME || 'configure-aws-ses-username';
  const sesPasswordRaw = process.env.SEED_SES_PASSWORD || 'configure-aws-ses-password';
  const sesPassword = await encrypt(sesPasswordRaw);
  
  const smtpSes = await prisma.smtpAccount.create({
    data: {
      orgId: org.id,
      provider: 'AWS SES',
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      username: sesUsername,
      passwordEnc: sesPassword,
      fromEmail: 'noreply@acme.com',
      rateLimitPerMin: 14,
      status: 'active',
    },
  });
  
  console.log('✅ SMTP SES account created');
  
  const titanUsername = process.env.SEED_TITAN_USERNAME || 'admin@acme.com';
  const titanPasswordRaw = process.env.SEED_TITAN_PASSWORD || 'configure-titan-password';
  const titanPassword = await encrypt(titanPasswordRaw);
  
  const smtpTitan = await prisma.smtpAccount.create({
    data: {
      orgId: org.id,
      provider: 'Titan Email',
      host: 'smtp.titan.email',
      port: 587,
      username: titanUsername,
      passwordEnc: titanPassword,
      fromEmail: 'admin@acme.com',
      rateLimitPerMin: 100,
      status: 'active',
    },
  });
  
  console.log('✅ SMTP Titan account created');
  
  // Create capabilities for SES
  await prisma.providerCapabilities.create({
    data: {
      smtpAccountId: smtpSes.id,
      starttls: true,
      size: 10 * 1024 * 1024,
      pipelining: true,
      eightBitMime: true,
      latencyMs: 150,
      lastTestAt: new Date(),
    },
  });
  
  // Create capabilities for Titan
  await prisma.providerCapabilities.create({
    data: {
      smtpAccountId: smtpTitan.id,
      starttls: true,
      size: 25 * 1024 * 1024,
      pipelining: true,
      eightBitMime: true,
      latencyMs: 200,
      lastTestAt: new Date(),
    },
  });
  
  console.log('✅ SMTP capabilities created');
  
  // Create identity
  await prisma.identity.create({
    data: {
      orgId: org.id,
      displayName: 'Acme Support',
      fromEmail: 'support@acme.com',
      defaultSmtpAccountId: smtpSes.id,
    },
  });
  
  console.log('✅ Identity created');
  
  // Create domain config
  await prisma.domainConfig.create({
    data: {
      orgId: org.id,
      domain: 'acme.com',
      dkimSelectorCurrent: 'dkim20240101',
      dmarcPolicy: 'none',
      dmarcPct: 100,
      aspf: 'r',
      adkim: 'r',
      ruaMailto: 'dmarc@acme.com',
    },
  });
  
  console.log('✅ Domain config created');
  
  console.log('');
  console.log('🎉 Seed completed!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email: admin@acme.com');
  console.log('  Password: Pass456@');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
