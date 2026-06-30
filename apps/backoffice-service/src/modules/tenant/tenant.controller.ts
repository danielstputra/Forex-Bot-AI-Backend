import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '@app/shared';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('tenant')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get('init')
  async getInitConfig(@Query('domain') domain: string) {
    return this.tenantService.getInitConfig(domain || 'app.forexbot.ai');
  }

  @Post('theme')
  @UseGuards(JwtAuthGuard)
  async updateTheme(@Request() req: any, @Body() body: any) {
    return this.tenantService.updateTheme(req.user.sub, body);
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/branding',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
        }
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|svg\+xml)$/)) {
          return cb(new BadRequestException('Only JPG, PNG, and SVG files are allowed!'), false);
        }
        cb(null, true);
      }
    })
  )
  async updateLogo(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Logo file is required.');
    return this.tenantService.updateLogo(req.user.sub, file.filename);
  }

  // ─── GAP 1: TenantSubscription Admin Endpoints ──────────────────────────────
  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllTenants() {
    return this.tenantService.getAllTenants();
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  async getTenantSubscriptions() {
    return this.tenantService.getTenantSubscriptions();
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  async createTenantSubscription(@Body() body: any) {
    return this.tenantService.createTenantSubscription(body);
  }

  @Patch('subscriptions/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateSubscriptionStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tenantService.updateTenantSubscriptionStatus(id, status);
  }
}

