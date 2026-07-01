import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API Key is missing. Please provide x-api-key header.');
    }

    // Hash the incoming key to match the database
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const apiKeyRecord = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            customRole: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!apiKeyRecord || apiKeyRecord.isRevoked) {
      throw new UnauthorizedException('Invalid or revoked API Key.');
    }

    if (apiKeyRecord.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account associated with this API Key is inactive.');
    }

    // Attach user to request
    request.user = {
      id: apiKeyRecord.user.id,
      sub: apiKeyRecord.user.id,
      email: apiKeyRecord.user.email,
      role: apiKeyRecord.user.customRole?.name || 'USER'
    };

    return true;
  }
}
