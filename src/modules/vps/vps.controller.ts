import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { VpsService } from './vps.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('vps')
@UseGuards(JwtAuthGuard)
export class VpsController {
  constructor(private vpsService: VpsService) {}

  @Get()
  async getVps(@Request() req: any) {
    return this.vpsService.getVps(req.user.sub);
  }

  @Post('provision')
  async provisionVps(@Request() req: any, @Body() body: any) {
    return this.vpsService.provisionVps(req.user.sub, body);
  }
}
