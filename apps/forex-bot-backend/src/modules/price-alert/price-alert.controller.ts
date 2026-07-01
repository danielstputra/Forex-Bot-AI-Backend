import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PriceAlertService } from './price-alert.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { CreateAlertDto } from './dto/price-alert.dto';

@Controller('price-alerts')
@UseGuards(JwtAuthGuard)
export class PriceAlertController {
  constructor(private priceAlertService: PriceAlertService) {}

  @Get()
  async getAlerts(@Request() req: any) {
    return this.priceAlertService.getAlerts(req.user.id);
  }

  @Post()
  async createAlert(@Request() req: any, @Body() body: CreateAlertDto) {
    return this.priceAlertService.createAlert(req.user.id, body);
  }

  @Delete(':id')
  async deleteAlert(@Request() req: any, @Param('id') id: string) {
    return this.priceAlertService.deleteAlert(req.user.id, id);
  }
}
