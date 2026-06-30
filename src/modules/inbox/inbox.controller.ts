import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(private inboxService: InboxService) {}

  @Get()
  async getMessages(@Request() req: any) {
    return this.inboxService.getMessages(req.user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    return this.inboxService.getUnreadCount(req.user.id);
  }

  @Post(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.inboxService.markAsRead(req.user.id, id);
  }

  @Post('read-all')
  async markAllRead(@Request() req: any) {
    return this.inboxService.markAllRead(req.user.id);
  }

  @Delete(':id')
  async deleteMessage(@Request() req: any, @Param('id') id: string) {
    return this.inboxService.deleteMessage(req.user.id, id);
  }
}
