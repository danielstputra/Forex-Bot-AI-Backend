import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class DeveloperService {
  constructor(private prisma: PrismaService) {}

  async getKeys(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'desc' }
    });

    return keys.map(k => {
      let name = 'Unnamed Key';
      let permission = 'Read Only';
      try {
        const parsed = JSON.parse(k.permissions);
        name = parsed.name || name;
        permission = parsed.scopes?.includes('TRADE') ? 'Trade Execution' : 'Read Only';
      } catch (e) {
        // Fallback if not JSON
        permission = k.permissions;
      }

      // Return masked key
      const maskedKey = `sk_live_••••••••••••${k.id.substring(0, 4)}`;

      return {
        id: k.id,
        name,
        key: maskedKey,
        permission,
        created: k.createdAt.toISOString().split('T')[0]
      };
    });
  }

  async generateKey(userId: string, body: any) {
    const { name, permission } = body; // permission: 'Read Only' or 'Trade Execution'
    if (!name) {
      throw new BadRequestException('Key name is required.');
    }

    // Generate secure random key
    const rawKey = `sk_live_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const scopes = permission === 'Trade Execution' ? ['READ', 'TRADE'] : ['READ'];
    const permissionsJson = JSON.stringify({ name, scopes });

    const newKey = await this.prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        permissions: permissionsJson,
        isRevoked: false
      }
    });

    return {
      id: newKey.id,
      name,
      key: rawKey, // Return raw key once
      permission,
      created: newKey.createdAt.toISOString().split('T')[0]
    };
  }

  async revokeKey(userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!key) {
      throw new BadRequestException('API Key not found.');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: { isRevoked: true }
    });
  }
}
