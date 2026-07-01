import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { GenerateApiKeyDto } from './dto/developer.dto';

@Controller('developer')
@UseGuards(JwtAuthGuard)
export class DeveloperController {
  constructor(private developerService: DeveloperService) {}

  @Get('keys')
  async getKeys(@Request() req: any) {
    return this.developerService.getKeys(req.user.id);
  }

  @Post('keys')
  async generateKey(@Request() req: any, @Body() body: GenerateApiKeyDto) {
    return this.developerService.generateKey(req.user.id, body);
  }

  @Delete('keys/:id')
  async revokeKey(@Request() req: any, @Param('id') id: string) {
    return this.developerService.revokeKey(req.user.id, id);
  }
}
