import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { getRsaKeys } from './jwt-rsa.helper';
import * as crypto from 'crypto';

@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Check API Key
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
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

      request.user = {
        id: apiKeyRecord.user.id,
        sub: apiKeyRecord.user.id,
        email: apiKeyRecord.user.email,
        role: apiKeyRecord.user.customRole?.name || 'USER'
      };

      return true;
    }

    // 2. Check JWT Token
    const authHeader = request.headers.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { publicKey } = getRsaKeys();
        const payload = await this.jwtService.verifyAsync(token, {
          publicKey,
          algorithms: ['RS256']
        });
        
        request.user = {
          ...payload,
          id: payload.sub
        };
        return true;
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired token.');
      }
    }

    throw new UnauthorizedException('Authentication credentials (JWT or API Key) are missing.');
  }
}
