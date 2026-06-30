import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('verify')
  async verifyAccount(@Body('token') token: string, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const ua = req.headers['user-agent'] || 'Unknown';
    return this.authService.verifyAccount(token, ip, ua);
  }

  @Post('login')
  async login(@Body() body: any, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const ua = req.headers['user-agent'] || 'Unknown';
    return this.authService.login(body, ip, ua);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: any, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const ua = req.headers['user-agent'] || 'Unknown';
    return this.authService.verifyOtp(body, ip, ua);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }

  @Post('google-login')
  async googleLogin(@Body() body: any, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const ua = req.headers['user-agent'] || 'Unknown';
    return this.authService.googleLogin(body, ip, ua);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any) {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    return this.authService.logout(req.user.sub, token, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('audit-logs')
  async getAuditLogs(@Request() req: any) {
    return this.authService.getDbAuditLogs(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('login-history')
  async getLoginHistory(@Request() req: any) {
    return this.authService.getLoginHistory(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getActiveSessions(@Request() req: any) {
    return this.authService.getActiveSessions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@Request() req: any, @Param('id') id: string) {
    return this.authService.revokeSession(req.user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  async setup2fa(@Request() req: any) {
    return this.authService.setup2fa(req.user.sub);
  }

  // ─── KYC DOCUMENT ──────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('kyc/documents')
  async getKycDocuments(@Request() req: any) {
    return this.authService.getKycDocuments(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('kyc/document')
  async submitKycDocument(@Request() req: any, @Body() body: any) {
    return this.authService.submitKycDocument(req.user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('kyc/upload')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return cb(new BadRequestException('Only JPG, PNG, and PDF files are allowed!'), false);
        }
        cb(null, true);
      }
    })
  )
  async uploadKyc(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded.');
    await this.authService.uploadKyc(req.user.sub, file.filename);
    return { status: 'success', fileUrl: `/uploads/kyc/${file.filename}`, message: 'KYC document uploaded and pending review.' };
  }
}
