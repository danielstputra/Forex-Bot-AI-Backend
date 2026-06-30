import { Controller, Post, Get, Body, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  async getWallets(@Request() req: any) {
    return this.walletService.getWallets(req.user.sub);
  }

  @Post('deposit')
  @UseInterceptors(
    FileInterceptor('proof', {
      storage: diskStorage({
        destination: './uploads/deposits',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'deposit-' + uniqueSuffix + path.extname(file.originalname));
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
  async requestDeposit(@Request() req: any, @Body() body: any, @UploadedFile() file: any) {
    const filename = file ? file.filename : null;
    return this.walletService.requestDeposit(req.user.sub, body, filename);
  }

  @Post('withdraw')
  async requestWithdrawal(@Request() req: any, @Body() body: any) {
    return this.walletService.requestWithdrawal(req.user.sub, body);
  }
}
