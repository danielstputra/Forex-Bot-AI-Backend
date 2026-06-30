import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class VpsService {
  constructor(private prisma: PrismaService) {}

  async getVps(userId: string) {
    const vps = await this.prisma.vpsInstance.findFirst({
      where: { userId }
    });
    return vps || null;
  }

  async provisionVps(userId: string, body: any) {
    const { planName, region } = body;
    if (!planName || !region) {
      throw new BadRequestException('planName and region are required.');
    }

    const existing = await this.prisma.vpsInstance.findFirst({
      where: { userId, status: 'RUNNING' }
    });
    if (existing) {
      throw new BadRequestException('You already have an active running VPS instance.');
    }

    // Generate a random public IP address
    const ip = `13.250.${Math.floor(10 + Math.random() * 200)}.${Math.floor(10 + Math.random() * 250)}`;

    return this.prisma.vpsInstance.create({
      data: {
        userId,
        ipAddress: ip,
        planName,
        region,
        status: 'RUNNING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
      }
    });
  }
}
