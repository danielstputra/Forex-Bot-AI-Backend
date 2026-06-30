const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding professional SaaS Forex database with Roles & Permissions...');

  // 1. Create Default Tenant (White-Label Partner)
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'app.forexbot.ai' },
    update: {},
    create: {
      name: 'Forex Bot AI Global',
      domain: 'app.forexbot.ai',
      logoUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=120&h=120&q=80',
      theme: {
        create: {
          primaryColor: '#06b6d4',
          secondaryColor: '#7c3aed',
          fontFamily: 'Inter'
        }
      }
    }
  });
  console.log(`Created Tenant: ${tenant.name} (${tenant.domain})`);

  // 2. Create Default Roles
  const roles = [
    { name: 'SUPERADMIN', description: 'Super Administrator with full access' },
    { name: 'ADMIN', description: 'Administrator with platform management access' },
    { name: 'MANAGER', description: 'PAMM / MAM Fund Manager' },
    { name: 'USER', description: 'Standard Retail Trader' }
  ];

  const roleMap = {};
  for (const r of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r
    });
    roleMap[r.name] = createdRole;
    console.log(`Created Role: ${createdRole.name}`);
  }

  // 3. Create Default Subscription Plans
  const plans = [
    {
      name: 'Basic Plan',
      description: 'Akses bot dasar untuk trading ritel',
      priceMonthly: 0.0,
      priceYearly: 0.0,
      tier: 'BASIC',
      featuresJson: JSON.stringify(['EUR/USD Only', '1m Timeframe', 'RSI Indicator'])
    },
    {
      name: 'Pro Plan',
      description: 'Akses penuh fitur multi-pair dan sentimen AI',
      priceMonthly: 49.0,
      priceYearly: 490.0,
      tier: 'PRO',
      featuresJson: JSON.stringify(['All Currency Pairs', 'All Timeframes', 'AI News Sentiment', 'Custom TakeProfit/StopLoss'])
    },
    {
      name: 'Enterprise Plan',
      description: 'Solusi B2B White-Label & PAMM Master-Slave',
      priceMonthly: 299.0,
      priceYearly: 2990.0,
      tier: 'ENTERPRISE',
      featuresJson: JSON.stringify(['All Pro Features', 'PAMM/MAM Allocation Matrix', 'White-Label Branding', 'Public API access'])
    }
  ];

  const planMap = {};
  for (const plan of plans) {
    const createdPlan = await prisma.subscriptionPlan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        featuresJson: plan.featuresJson
      },
      create: plan
    });
    planMap[plan.tier] = createdPlan;
    console.log(`Created Subscription Plan: ${createdPlan.name} (${createdPlan.tier})`);
  }

  // 4. Create Default Market Symbols
  const symbols = [
    { symbol: 'EURUSD', baseCurrency: 'EUR', quoteCurrency: 'USD', pipSize: 0.0001, digits: 5 },
    { symbol: 'GBPUSD', baseCurrency: 'GBP', quoteCurrency: 'USD', pipSize: 0.0001, digits: 5 },
    { symbol: 'USDJPY', baseCurrency: 'USD', quoteCurrency: 'JPY', pipSize: 0.01, digits: 3 },
    { symbol: 'AUDUSD', baseCurrency: 'AUD', quoteCurrency: 'USD', pipSize: 0.0001, digits: 5 }
  ];

  for (const sym of symbols) {
    const createdSym = await prisma.marketSymbol.upsert({
      where: { symbol: sym.symbol },
      update: {},
      create: sym
    });
    console.log(`Created Market Symbol: ${createdSym.symbol}`);
  }

  // 5. Create Gamification Badges
  const badges = [
    {
      name: 'Survivor',
      description: 'Drawdown maksimal akun di bawah 20%',
      iconName: 'ShieldCheck',
      requiredVol: 0.0
    },
    {
      name: 'Sniper',
      description: 'Mencapai akurasi Win Rate di atas 80% dalam 1 minggu',
      iconName: 'Sparkles',
      requiredVol: 0.0
    },
    {
      name: 'Whale Trader',
      description: 'Total volume transaksi mencapai 100.0 Lot',
      iconName: 'Flame',
      requiredVol: 100.0
    },
    {
      name: 'Early Pioneer',
      description: 'Menjadi pengguna aktif selama minimal 3 bulan',
      iconName: 'Award',
      requiredVol: 0.0
    }
  ];

  for (const badge of badges) {
    const existing = await prisma.badge.findFirst({ where: { name: badge.name } });
    if (!existing) {
      const createdBadge = await prisma.badge.create({ data: badge });
      console.log(`Created Gamification Badge: ${createdBadge.name}`);
    }
  }

  // 6. Create Default System Menus & Role Accesses
  console.log('Seeding System Menus...');
  // Delete role accesses first to avoid foreign key constraint issues
  await prisma.roleMenuAccess.deleteMany({});
  await prisma.userMenuPermission.deleteMany({});
  await prisma.systemMenu.deleteMany({});
  
  const defaultMenus = [
    { key: 'dashboard', name: 'Dashboard Utama', path: 'dashboard', iconName: 'TrendingUp', order: 1, isActive: true },
    { key: 'inbox', name: 'Kotak Masuk', path: 'inbox', iconName: 'Mail', order: 2, isActive: true },
    { key: 'history', name: 'Riwayat Transaksi', path: 'history', iconName: 'History', order: 3, isActive: true },
    { key: 'fintech', name: 'Fintech Hub', path: 'fintech', iconName: 'Wallet', order: 4, isActive: true },
    { key: 'backtest', name: 'Backtesting Engine', path: 'backtest', iconName: 'LineChart', order: 5, isActive: true },
    { key: 'social', name: 'Social Trading', path: 'social', iconName: 'Users', order: 6, isActive: true },
    { key: 'pamm', name: 'PAMM/MAM Manager', path: 'pamm', iconName: 'Percent', order: 7, isActive: true },
    { key: 'security_kyc', name: 'Keamanan & KYC', path: 'security_kyc', iconName: 'ShieldCheck', order: 8, isActive: true },
    { key: 'affiliate', name: 'Program Afiliasi', path: 'affiliate', iconName: 'Award', order: 9, isActive: true },
    { key: 'help', name: 'Pusat Bantuan', path: 'help', iconName: 'HelpCircle', order: 10, isActive: true },
    { key: 'audit', name: 'Audit Trail', path: 'audit', iconName: 'Shield', order: 11, isActive: true },
    { key: 'developer', name: 'Developer Portal', path: 'developer', iconName: 'Code', order: 12, isActive: true },
    { key: 'backoffice', name: 'Backoffice (Admin)', path: 'backoffice', iconName: 'Settings', order: 13, isActive: true },
    { key: 'logs', name: 'System Logs', path: 'logs', iconName: 'Terminal', order: 14, isActive: true }
  ];

  const menuMap = {};
  for (const m of defaultMenus) {
    const createdMenu = await prisma.systemMenu.create({ data: m });
    menuMap[m.key] = createdMenu;
  }
  console.log('System Menus seeded successfully!');

  // 7. Seed Role Menu Access Mapping
  console.log('Seeding Role Menu Accesses...');

  // Helper to add access using upsert
  const grantAccess = async (roleName, menuKeys, canWrite = false) => {
    const roleId = roleMap[roleName].id;
    for (const key of menuKeys) {
      if (menuMap[key]) {
        await prisma.roleMenuAccess.upsert({
          where: {
            roleId_menuId: {
              roleId,
              menuId: menuMap[key].id
            }
          },
          update: {
            canRead: true,
            canWrite
          },
          create: {
            roleId,
            menuId: menuMap[key].id,
            canRead: true,
            canWrite
          }
        });
      }
    }
  };

  // SUPERADMIN & ADMIN: Access everything
  const allMenuKeys = defaultMenus.map(m => m.key);
  await grantAccess('SUPERADMIN', allMenuKeys, true);
  await grantAccess('ADMIN', allMenuKeys, true);

  // MANAGER: Access core trading, pamm, and help
  await grantAccess('MANAGER', ['dashboard', 'inbox', 'history', 'fintech', 'pamm', 'security_kyc', 'help', 'audit'], true);

  // USER: Access everything except backoffice, logs, and audit
  const userMenuKeys = allMenuKeys.filter(k => k !== 'backoffice' && k !== 'logs' && k !== 'audit');
  await grantAccess('USER', userMenuKeys, false);
  // Give USER write access to security_kyc and help (to submit tickets / documents)
  await grantAccess('USER', ['security_kyc', 'help'], true);

  console.log('Role Menu Accesses seeded successfully!');

  // 8. Create Default Users (Admin & Retail User)
  const adminEmail = 'admin@forexbot.ai';
  const userEmail = 'user@forexbot.ai';
  
  const passwordHash = await argon2.hash('Password123!');

  // Seed Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { 
      passwordHash,
      isVerified: true,
      roleId: roleMap['SUPERADMIN'].id
    },
    create: {
      email: adminEmail,
      legalName: 'Super Administrator',
      passwordHash,
      role: 'SUPERADMIN',
      status: 'ACTIVE',
      tenantId: tenant.id,
      kycStatus: 'APPROVED',
      isVerified: true,
      roleId: roleMap['SUPERADMIN'].id
    }
  });
  console.log(`Created/Updated Admin User: ${adminUser.email}`);

  // Seed Retail User
  const retailUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: { 
      passwordHash,
      isVerified: true,
      roleId: roleMap['USER'].id
    },
    create: {
      email: userEmail,
      legalName: 'Retail Trader',
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      isVerified: true,
      roleId: roleMap['USER'].id
    }
  });
  console.log(`Created/Updated Retail User: ${retailUser.email}`);

  // Ensure both users have default Subscription & Wallet
  const users = [adminUser, retailUser];
  for (const u of users) {
    const sub = await prisma.subscription.findUnique({ where: { userId: u.id } });
    if (!sub) {
      await prisma.subscription.create({
        data: {
          userId: u.id,
          planId: planMap['BASIC'].id,
          status: 'ACTIVE',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
    }

    const config = await prisma.botConfig.findFirst({ where: { userId: u.id } });
    if (!config) {
      await prisma.botConfig.create({
        data: {
          userId: u.id,
          strategyName: 'Default AI Strategy',
          riskTolerance: 2.0,
          lotMultiplier: 1.0,
          maxDrawdown: 20.0
        }
      });
    }

    // Seed UserWallet
    const wallet = await prisma.userWallet.findFirst({ where: { userId: u.id, currency: 'USD' } });
    if (!wallet) {
      await prisma.userWallet.create({
        data: {
          userId: u.id,
          currency: 'USD',
          balance: 10000.00,
          status: 'ACTIVE'
        }
      });
    }
  }

  // 9. Create Default AppConfig
  await prisma.appConfig.deleteMany({});
  await prisma.appConfig.create({
    data: {
      appName: 'Forex Bot AI',
      appDescription: 'Professional SaaS Forex Trading Bot Platform',
      backendUrl: 'http://localhost:5000',
      logoUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=120&h=120&q=80',
      appVersion: 'v3.0.0',
      appUrl: 'https://app.forexbot.ai',
      appKey: 'FX-BOT-AI-KEY-2026',
      supportEmail: 'support@forexbot.ai',
      supportTelegram: '@forexbot_support',
      defaultLanguage: 'ID',
      maintenanceMode: false,
      globalMinDeposit: 10.0,
      globalCommissionPct: 0.0,
      activeMenusJson: JSON.stringify(allMenuKeys),
      
      // Default Advanced Auth Configs
      loginOtpEnabled: false,
      smtpEnabled: false,
      oauthEnabled: false,
      smtpHost: 'smtp.mailtrap.io',
      smtpPort: 2525,
      smtpUser: '',
      smtpPass: '',
      smtpSender: 'noreply@forexbot.ai',
      googleClientId: ''
    }
  });
  console.log('Created Default AppConfig');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
