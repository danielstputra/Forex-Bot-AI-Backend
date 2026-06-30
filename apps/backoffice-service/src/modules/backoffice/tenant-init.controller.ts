import { Controller, Get, Request } from '@nestjs/common';
import { BackofficeService } from './backoffice.service';

@Controller('tenant')
export class TenantInitController {
  constructor(private backofficeService: BackofficeService) {}

  @Get('init')
  async getTenantInit(@Request() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    return this.backofficeService.getTenantBranding(tenantId);
  }
}
