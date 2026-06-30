import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRsaKeys } from './jwt-rsa.helper';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is missing.');
    }

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
}
