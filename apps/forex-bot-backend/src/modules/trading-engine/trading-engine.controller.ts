import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TradingEngineService } from './trading-engine.service';
import { JwtOrApiKeyGuard } from '../../core/auth/jwt-or-api-key.guard';
import { UpdateConfigDto, ExecuteOrderDto, GenerateLicenseDto } from './dto/trading-engine.dto';

@Controller('trading')
@UseGuards(JwtOrApiKeyGuard)
export class TradingEngineController {
  constructor(private tradingEngineService: TradingEngineService) {}

  @Post('bot/start')
  async startBot(@Request() req: any) {
    return this.tradingEngineService.startBot(req.user.sub);
  }

  @Post('bot/stop')
  async stopBot(@Request() req: any) {
    return this.tradingEngineService.stopBot(req.user.sub);
  }

  @Post('config')
  async updateConfig(@Request() req: any, @Body() body: UpdateConfigDto) {
    return this.tradingEngineService.updateConfig(req.user.sub, body);
  }

  @Post('order')
  async executeOrder(@Request() req: any, @Body() body: ExecuteOrderDto) {
    return this.tradingEngineService.executeOrder(req.user.sub, body);
  }

  // GAP 5: Strategy License endpoints
  @Post('license/generate')
  async generateLicense(@Request() req: any, @Body() body: GenerateLicenseDto) {
    return this.tradingEngineService.generateLicense(req.user.sub, body);
  }

  @Get('license')
  async getLicenses(@Request() req: any) {
    return this.tradingEngineService.getLicenses(req.user.sub);
  }

  @Delete('license/:id')
  async revokeLicense(@Request() req: any, @Param('id') id: string) {
    return this.tradingEngineService.revokeLicense(req.user.sub, id);
  }

  // GAP 4: Order execution logs
  @Get('order-logs')
  async getOrderLogs(@Request() req: any) {
    return this.tradingEngineService.getOrderLogs(req.user.sub);
  }
}
