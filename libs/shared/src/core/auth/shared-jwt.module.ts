import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { getRsaKeys } from './jwt-rsa.helper';

const keys = getRsaKeys();

@Global()
@Module({
  imports: [
    JwtModule.register({
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      signOptions: { algorithm: 'RS256', expiresIn: '1d' },
    }),
  ],
  exports: [JwtModule],
})
export class SharedJwtModule {}
