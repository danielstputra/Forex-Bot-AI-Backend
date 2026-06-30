import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/shared';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async getInitConfig(domain: string) {
    // Find tenant by domain
    const tenant = await this.prisma.tenant.findUnique({
      where: { domain },
      include: { theme: true }
    });

    if (!tenant) {
      // Return default platform branding
      return {
        isCustom: false,
        name: 'Forex Bot AI',
        logoUrl: null,
        theme: {
          primaryColor: '#06b6d4',
          secondaryColor: '#7c3aed',
          fontFamily: 'Inter'
        }
      };
    }

    return {
      isCustom: true,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      theme: tenant.theme ? {
        primaryColor: tenant.theme.primaryColor,
        secondaryColor: tenant.theme.secondaryColor,
        fontFamily: tenant.theme.fontFamily,
        customCss: tenant.theme.customCss
      } : {
        primaryColor: '#06b6d4',
        secondaryColor: '#7c3aed',
        fontFamily: 'Inter'
      }
    };
  }

  async updateTheme(userId: string, body: any) {
    const { primaryColor, secondaryColor, fontFamily, customCss } = body;
    
    // Find the tenant associated with this admin user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    });

    if (!user || !user.tenantId) {
      throw new BadRequestException('User is not associated with any tenant.');
    }

    return this.prisma.tenantTheme.upsert({
      where: { tenantId: user.tenantId },
      update: {
        primaryColor,
        secondaryColor,
        fontFamily,
        customCss
      },
      create: {
        tenantId: user.tenantId,
        primaryColor: primaryColor || '#06b6d4',
        secondaryColor: secondaryColor || '#7c3aed',
        fontFamily: fontFamily || 'Inter',
        customCss
      }
    });
  }

  async updateLogo(userId: string, filename: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    });

    if (!user || !user.tenantId) {
      throw new BadRequestException('User is not associated with any tenant.');
    }

    const logoUrl = `/uploads/branding/${filename}`;

    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { logoUrl }
    });

    return { logoUrl };
  }

  // ─── GAP 1: TenantSubscription ──────────────────────────────────────────────
  async getTenantSubscriptions() {
    return this.prisma.tenantSubscription.findMany({
      include: { tenant: { select: { name: true, domain: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTenantSubscription(body: any) {
    const { tenantId, planName, price, validDays } = body;
    if (!tenantId || !planName || !price) {
      throw new BadRequestException('tenantId, planName, and price are required.');
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (validDays || 365));

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planName,
        price: parseFloat(price),
        validUntil,
        status: 'ACTIVE'
      }
    });
  }

  async updateTenantSubscriptionStatus(subscriptionId: string, status: string) {
    return this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: { status }
    });
  }

  async getAllTenants() {
    return this.prisma.tenant.findMany({
      include: {
        theme: true,
        subscriptions: true,
        _count: { select: { users: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
