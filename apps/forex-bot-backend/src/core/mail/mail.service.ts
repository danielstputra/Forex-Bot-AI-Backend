import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private prisma: PrismaService) {}

  private async getTransporter() {
    const config = await this.prisma.appConfig.findFirst();
    if (!config || !config.smtpEnabled) {
      return null;
    }

    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string, text: string) {
    const config = await this.prisma.appConfig.findFirst();
    const sender = config?.smtpSender || 'noreply@forexbot.ai';

    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.log(`[MOCK EMAIL] HTML Content: ${html}`);
      return { status: 'mocked', message: 'SMTP disabled, email logged to console.' };
    }

    try {
      await transporter.sendMail({
        from: `"${config?.appName || 'Forex Bot AI'}" <${sender}>`,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email successfully sent to ${to}`);
      return { status: 'sent' };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    const config = await this.prisma.appConfig.findFirst();
    const appUrl = config?.appUrl || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-account?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #06b6d4; text-align: center;">Verifikasi Akun Anda</h2>
        <p>Halo,</p>
        <p>Terima kasih telah mendaftar di <strong>${config?.appName || 'Forex Bot AI'}</strong>. Silakan klik tombol di bawah ini untuk memverifikasi akun Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: linear-gradient(135deg, #06b6d4, #7c3aed); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verifikasi Akun</a>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center;">Jika tombol di atas tidak berfungsi, salin tautan berikut ke browser Anda:<br>${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Layanan Keamanan ${config?.appName || 'Forex Bot AI'}</p>
      </div>
    `;

    return this.sendMail(
      to,
      `Verifikasi Akun - ${config?.appName || 'Forex Bot AI'}`,
      html,
      `Silakan verifikasi akun Anda dengan membuka tautan berikut: ${verifyUrl}`
    );
  }

  async sendOtpEmail(to: string, code: string) {
    const config = await this.prisma.appConfig.findFirst();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #06b6d4; text-align: center;">Kode OTP Masuk Anda</h2>
        <p>Halo,</p>
        <p>Gunakan kode keamanan sekali pakai (OTP) berikut untuk masuk ke akun Anda. Kode ini berlaku selama 5 menit:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7c3aed; background-color: #f1f5f9; padding: 15px 30px; border-radius: 12px; border: 1px dashed #cbd5e1; display: inline-block;">${code}</span>
        </div>
        <p style="font-weight: bold; color: #e11d48;">PENTING: Jangan bagikan kode ini kepada siapapun.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Layanan Keamanan ${config?.appName || 'Forex Bot AI'}</p>
      </div>
    `;

    return this.sendMail(
      to,
      `Kode OTP Masuk - ${config?.appName || 'Forex Bot AI'}`,
      html,
      `Kode OTP masuk Anda adalah: ${code}`
    );
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const config = await this.prisma.appConfig.findFirst();
    const appUrl = config?.appUrl || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e11d48; text-align: center;">Permintaan Atur Ulang Kata Sandi</h2>
        <p>Halo,</p>
        <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda di <strong>${config?.appName || 'Forex Bot AI'}</strong>. Silakan klik tombol di bawah ini untuk melanjutkan:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e11d48; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Atur Ulang Kata Sandi</a>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center;">Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini.</p>
        <p style="font-size: 11px; color: #64748b; text-align: center;">Tautan ini akan kedaluwarsa dalam 1 jam.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Layanan Keamanan ${config?.appName || 'Forex Bot AI'}</p>
      </div>
    `;

    return this.sendMail(
      to,
      `Atur Ulang Kata Sandi - ${config?.appName || 'Forex Bot AI'}`,
      html,
      `Silakan atur ulang kata sandi Anda dengan membuka tautan berikut: ${resetUrl}`
    );
  }

  async sendActivationEmail(to: string) {
    const config = await this.prisma.appConfig.findFirst();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981; text-align: center;">Akun Berhasil Diaktifkan</h2>
        <p>Halo,</p>
        <p>Selamat! Akun Anda di <strong>${config?.appName || 'Forex Bot AI'}</strong> telah berhasil diverifikasi dan diaktifkan.</p>
        <p>Anda sekarang dapat mengakses semua fitur yang tersedia di dashboard platform.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Layanan Pelanggan ${config?.appName || 'Forex Bot AI'}</p>
      </div>
    `;

    return this.sendMail(
      to,
      `Akun Berhasil Diaktifkan - ${config?.appName || 'Forex Bot AI'}`,
      html,
      `Selamat! Akun Anda telah diaktifkan dan siap digunakan.`
    );
  }
}
