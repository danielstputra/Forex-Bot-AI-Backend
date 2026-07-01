import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { CreateTicketDto, SendTicketMessageDto } from './dto/support.dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Get('tickets')
  async getTickets(@Request() req: any) {
    return this.supportService.getTickets(req.user.sub);
  }

  @Post('tickets')
  async createTicket(@Request() req: any, @Body() body: CreateTicketDto) {
    return this.supportService.createTicket(req.user.sub, body);
  }

  @Get('tickets/:id/messages')
  async getTicketMessages(@Request() req: any, @Param('id') id: string) {
    return this.supportService.getTicketMessages(req.user.sub, id);
  }

  @Post('tickets/:id/messages')
  async sendTicketMessage(@Request() req: any, @Param('id') id: string, @Body() body: SendTicketMessageDto) {
    return this.supportService.sendTicketMessage(req.user.sub, id, body);
  }

  @Get('articles')
  async getArticles() {
    return this.supportService.getArticles();
  }
}
