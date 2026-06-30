import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '@app/shared';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Get('leaders')
  async getLeaders(@Request() req: any) {
    return this.socialService.getLeaders(req.user.id);
  }

  @Get('connections')
  async getConnections(@Request() req: any) {
    return this.socialService.getConnections(req.user.id);
  }

  @Post('copy/:leaderId')
  async startCopying(@Request() req: any, @Param('leaderId') leaderId: string, @Body() body: any) {
    return this.socialService.startCopying(req.user.id, leaderId, body);
  }

  @Delete('copy/:connectionId')
  async stopCopying(@Request() req: any, @Param('connectionId') connectionId: string) {
    return this.socialService.stopCopying(req.user.id, connectionId);
  }
}
