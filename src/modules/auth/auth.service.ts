import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../core/mail/mail.service';
import { hashPassword, verifyPassword } from '../../core/utils/crypto.util';
import { getRsaKeys } from '../../core/auth/jwt-rsa.helper';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService
  ) {}

  async register(body: any) {
    const { email, password, legalName } = body;
    if (!email || !password || !legalName) {
      throw new BadRequestException('Email, password, dan nama lengkap wajib diisi.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email sudah terdaftar.');
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          legalName,
          passwordHash,
          isVerified: false,
          verificationToken,
          kycStatus: 'PENDING',
          role: email.includes('admin') ? 'SUPERADMIN' : 'USER'
        }
      });

      let basicPlan = await tx.subscriptionPlan.findUnique({ where: { tier: 'BASIC' } });
      if (!basicPlan) {
        basicPlan = await tx.subscriptionPlan.create({
          data: {
            name: 'Basic Plan',
            priceMonthly: 0.0,
            priceYearly: 0.0,
            tier: 'BASIC',
            featuresJson: JSON.stringify(['EUR/USD Only', '1m Timeframe'])
          }
        });
      }

      await tx.subscription.create({
        data: {
          userId: user.id,
          planId: basicPlan.id,
          status: 'ACTIVE',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });

      await tx.botConfig.create({
        data: {
          userId: user.id,
          strategyName: 'Default AI Strategy',
          riskTolerance: 2.0,
          lotMultiplier: 1.0,
          maxDrawdown: 20.0
        }
      });

      return user;
    });

    // Kirim email verifikasi ke pengguna
    try {
      await this.mailService.sendVerificationEmail(result.email, verificationToken);
    } catch (e) {
      console.error('Gagal mengirim email verifikasi:', e);
    }

    return { id: result.id, email: result.email, legalName: result.legalName, message: 'Registrasi berhasil. Silakan cek email Anda untuk verifikasi akun.' };
  }

  async verifyAccount(token: string, ipAddress: string, userAgent: string) {
    if (!token) {
      throw new BadRequestException('Token verifikasi wajib disertakan.');
    }

    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      throw new BadRequestException('Token verifikasi tidak valid atau kedaluwarsa.');
    }

    // Update status verifikasi user
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null
      },
      include: { subscription: { include: { plan: true } } }
    });

    // Kirim email notifikasi aktivasi berhasil
    try {
      await this.mailService.sendActivationEmail(updatedUser.email);
    } catch (e) {
      console.error('Gagal mengirim email aktivasi:', e);
    }

    // Auto Login: Generate JWT & session
    const { privateKey } = getRsaKeys();
    const tier = updatedUser.subscription?.plan.tier || 'BASIC';
    const payload = { sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role, tier };

    const jwtToken = await this.jwtService.signAsync(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: '15m'
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.loginAttempt.create({
        data: {
          email: updatedUser.email,
          userId: updatedUser.id,
          ipAddress,
          userAgent,
          success: true,
          attemptedAt: new Date()
        }
      }),
      this.prisma.userSession.create({
        data: {
          userId: updatedUser.id,
          token: jwtToken,
          ipAddress,
          deviceAgent: userAgent,
          expiresAt
        }
      }),
      this.prisma.auditLog.create({
        data: {
          userId: updatedUser.id,
          action: 'LOGIN',
          ipAddress,
          details: `Login otomatis setelah verifikasi akun sukses`,
          status: 'SUCCESS'
        }
      })
    ]);

    return {
      access_token: jwtToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        legalName: updatedUser.legalName,
        role: updatedUser.role,
        tier,
        kycStatus: updatedUser.kycStatus,
        twoFactorOn: updatedUser.twoFactorOn
      }
    };
  }

  async login(body: any, ipAddress: string, userAgent: string) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email dan password wajib diisi.');
    }

    const user = await this.prisma.user.findUnique({ 
      where: { email },
      include: { subscription: { include: { plan: true } } }
    });

    const attemptData = {
      email,
      userId: user?.id ?? null,
      ipAddress,
      userAgent,
      success: false,
      attemptedAt: new Date()
    };

    if (!user) {
      await this.prisma.loginAttempt.create({ data: { ...attemptData } });
      throw new UnauthorizedException('Kredensial tidak valid.');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await this.prisma.loginAttempt.create({ data: { ...attemptData } });
      throw new UnauthorizedException('Kredensial tidak valid.');
    }

    // Cek apakah akun sudah terverifikasi
    if (!user.isVerified) {
      throw new UnauthorizedException('Akun Anda belum diverifikasi. Silakan periksa email Anda untuk tautan verifikasi.');
    }

    // Ambil konfigurasi aplikasi untuk memeriksa apakah OTP diaktifkan
    const appConfig = await this.prisma.appConfig.findFirst();
    if (appConfig?.loginOtpEnabled) {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiresAt }
      });

      // Kirim OTP ke email
      try {
        await this.mailService.sendOtpEmail(user.email, otpCode);
      } catch (e) {
        console.error('Gagal mengirim OTP:', e);
      }

      return {
        status: 'OTP_REQUIRED',
        email: user.email,
        message: 'Kode verifikasi OTP telah dikirim ke email Anda.'
      };
    }

    const { privateKey } = getRsaKeys();
    const tier = user.subscription?.plan.tier || 'BASIC';
    const payload = { sub: user.id, email: user.email, role: user.role, tier };

    const token = await this.jwtService.signAsync(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: '15m'
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.loginAttempt.create({
        data: { ...attemptData, success: true }
      }),
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          ipAddress,
          deviceAgent: userAgent,
          expiresAt
        }
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          ipAddress,
          details: `Login dari ${userAgent}`,
          status: 'SUCCESS'
        }
      })
    ]);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        legalName: user.legalName,
        role: user.role,
        tier,
        kycStatus: user.kycStatus,
        twoFactorOn: user.twoFactorOn
      }
    };
  }

  async verifyOtp(body: any, ipAddress: string, userAgent: string) {
    const { email, code } = body;
    if (!email || !code) {
      throw new BadRequestException('Email dan kode OTP wajib diisi.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { subscription: { include: { plan: true } } }
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      throw new UnauthorizedException('Permintaan OTP tidak ditemukan.');
    }

    if (user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Kode OTP telah kedaluwarsa.');
    }

    if (user.otpCode !== code) {
      throw new UnauthorizedException('Kode OTP tidak cocok.');
    }

    // Bersihkan OTP dari database setelah verifikasi sukses
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null }
    });

    const { privateKey } = getRsaKeys();
    const tier = user.subscription?.plan.tier || 'BASIC';
    const payload = { sub: user.id, email: user.email, role: user.role, tier };

    const token = await this.jwtService.signAsync(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: '15m'
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.loginAttempt.create({
        data: {
          email: user.email,
          userId: user.id,
          ipAddress,
          userAgent,
          success: true,
          attemptedAt: new Date()
        }
      }),
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          ipAddress,
          deviceAgent: userAgent,
          expiresAt
        }
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          ipAddress,
          details: `Login via OTP Verifikasi sukses`,
          status: 'SUCCESS'
        }
      })
    ]);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        legalName: user.legalName,
        role: user.role,
        tier,
        kycStatus: user.kycStatus,
        twoFactorOn: user.twoFactorOn
      }
    };
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Email wajib diisi.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Untuk alasan keamanan, jangan beritahu peretas apakah email terdaftar atau tidak
      return { message: 'Tautan atur ulang kata sandi telah dikirim ke email jika alamat terdaftar.' };
    }

    const resetPasswordToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordExpiresAt }
    });

    try {
      await this.mailService.sendResetPasswordEmail(user.email, resetPasswordToken);
    } catch (e) {
      console.error('Gagal mengirim email reset sandi:', e);
    }

    return { message: 'Tautan atur ulang kata sandi telah dikirim ke email jika alamat terdaftar.' };
  }

  async resetPassword(body: any) {
    const { token, newPassword } = body;
    if (!token || !newPassword) {
      throw new BadRequestException('Token dan kata sandi baru wajib diisi.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: { gt: new Date() }
      }
    });

    if (!user) {
      throw new BadRequestException('Token reset kata sandi tidak valid atau telah kedaluwarsa.');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null
      }
    });

    return { message: 'Kata sandi Anda berhasil diperbarui. Silakan login kembali.' };
  }

  async googleLogin(body: any, ipAddress: string, userAgent: string) {
    const { email, name, googleId, idToken } = body;
    
    // Cek apakah Google OAuth diaktifkan di konfigurasi global
    const appConfig = await this.prisma.appConfig.findFirst();
    if (appConfig && !appConfig.oauthEnabled) {
      throw new BadRequestException('Login Google OAuth dinonaktifkan oleh administrator.');
    }

    let verifiedEmail = email;
    let verifiedName = name;

    // Jika idToken dikirim, verifikasi menggunakan Google tokeninfo API (production grade)
    if (idToken) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (response.ok) {
          const payload = await response.json();
          verifiedEmail = payload.email;
          verifiedName = payload.name || verifiedName;
        } else {
          throw new UnauthorizedException('Token Google tidak valid.');
        }
      } catch (err) {
        throw new UnauthorizedException('Gagal memverifikasi token Google: ' + err.message);
      }
    }

    if (!verifiedEmail) {
      throw new BadRequestException('Email Google tidak valid.');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: verifiedEmail },
      include: { subscription: { include: { plan: true } } }
    });

    if (!user) {
      // Registrasi otomatis jika pengguna baru masuk via Google
      const dummyPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await hashPassword(dummyPassword);

      const createdUser = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: verifiedEmail,
            legalName: verifiedName || verifiedEmail.split('@')[0],
            passwordHash,
            isVerified: true, // Login via Google otomatis terverifikasi
            kycStatus: 'PENDING',
            role: 'USER'
          }
        });

        let basicPlan = await tx.subscriptionPlan.findUnique({ where: { tier: 'BASIC' } });
        if (!basicPlan) {
          basicPlan = await tx.subscriptionPlan.create({
            data: {
              name: 'Basic Plan',
              priceMonthly: 0.0,
              priceYearly: 0.0,
              tier: 'BASIC',
              featuresJson: JSON.stringify(['EUR/USD Only', '1m Timeframe'])
            }
          });
        }

        await tx.subscription.create({
          data: {
            userId: newUser.id,
            planId: basicPlan.id,
            status: 'ACTIVE',
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        });

        await tx.botConfig.create({
          data: {
            userId: newUser.id,
            strategyName: 'Default AI Strategy',
            riskTolerance: 2.0,
            lotMultiplier: 1.0,
            maxDrawdown: 20.0
          }
        });

        return newUser;
      });

      // Muat ulang relasi setelah transaksi
      user = await this.prisma.user.findUnique({
        where: { id: createdUser.id },
        include: { subscription: { include: { plan: true } } }
      });
    } else if (!user.isVerified) {
      // Jika pengguna sudah ada tapi belum terverifikasi secara lokal, verifikasi otomatis melalui Google OAuth
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
        include: { subscription: { include: { plan: true } } }
      });
    }

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan atau gagal dibuat.');
    }

    const { privateKey } = getRsaKeys();
    const tier = user.subscription?.plan.tier || 'BASIC';
    const payload = { sub: user.id, email: user.email, role: user.role, tier };

    const token = await this.jwtService.signAsync(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: '15m'
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.loginAttempt.create({
        data: {
          email: user.email,
          userId: user.id,
          ipAddress,
          userAgent,
          success: true,
          attemptedAt: new Date()
        }
      }),
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          ipAddress,
          deviceAgent: userAgent,
          expiresAt
        }
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          ipAddress,
          details: `Login via Google OAuth`,
          status: 'SUCCESS'
        }
      })
    ]);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        legalName: user.legalName,
        role: user.role,
        tier,
        kycStatus: user.kycStatus,
        twoFactorOn: user.twoFactorOn
      }
    };
  }

  async logout(userId: string, token: string, ipAddress: string) {
    await this.prisma.$transaction([
      this.prisma.userSession.deleteMany({ where: { userId, token } }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGOUT',
          ipAddress,
          details: 'User logged out',
          status: 'SUCCESS'
        }
      })
    ]);
    return { message: 'Logged out successfully.' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } }, botConfigs: true }
    });

    if (!user) throw new BadRequestException('User not found.');

    return {
      id: user.id,
      email: user.email,
      legalName: user.legalName,
      phone: user.phone,
      country: user.country,
      role: user.role,
      kycStatus: user.kycStatus,
      twoFactorOn: user.twoFactorOn,
      subscription: user.subscription,
      tier: user.subscription?.plan.tier || 'BASIC',
      botConfig: user.botConfigs[0] || null
    };
  }

  async updateProfile(userId: string, body: any) {
    const { legalName, phone, country, newPassword } = body;
    
    const updateData: any = {};
    if (legalName !== undefined) updateData.legalName = legalName;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    
    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      legalName: updatedUser.legalName,
      phone: updatedUser.phone,
      country: updatedUser.country,
      role: updatedUser.role,
      kycStatus: updatedUser.kycStatus,
      twoFactorOn: updatedUser.twoFactorOn
    };
  }

  async getDbAuditLogs(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async getLoginHistory(userId: string) {
    return this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: 'desc' },
      take: 20
    });
  }

  async getActiveSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.prisma.userSession.deleteMany({
      where: { id: sessionId, userId }
    });
  }

  async submitKycDocument(userId: string, body: any) {
    const { documentType, documentNumber, fileUrl } = body;
    if (!documentType || !documentNumber || !fileUrl) {
      throw new BadRequestException('documentType, documentNumber, and fileUrl are required.');
    }

    await this.prisma.kycDocument.create({
      data: {
        userId,
        documentType,
        documentNumber,
        fileUrl,
        status: 'PENDING'
      }
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING' }
    });

    return { message: 'Dokumen KYC berhasil dikirim untuk verifikasi.' };
  }

  async getKycDocuments(userId: string) {
    return this.prisma.kycDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async uploadKyc(userId: string, filename: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING', kycDocumentUrl: `/uploads/kyc/${filename}` }
    });
  }

  async setup2fa(userId: string, code: string) {
    if (!code) {
      throw new BadRequestException('Kode OTP wajib diisi.');
    }

    // Verifikasi OTP menggunakan fungsi TOTP murni
    const isOtpValid = verifyTOTP(code, 'JBSWY3DPEHPK3PXP');
    if (!isOtpValid) {
      throw new BadRequestException('Kode OTP 2FA tidak valid atau sudah kedaluwarsa.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorOn: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' }
    });
  }

  async getAppConfig() {
    let config = await this.prisma.appConfig.findFirst();
    if (!config) {
      config = await this.prisma.appConfig.create({
        data: {
          appName: 'Forex Bot AI',
          appDescription: 'Professional SaaS Forex Trading Bot Platform',
          backendUrl: 'https://forex-bot-ai-backend-production.up.railway.app',
          logoUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=120&h=120&q=80',
          appVersion: 'v3.0.0',
          appUrl: 'https://app.forexbot.ai',
          appKey: 'FX-BOT-AI-KEY-2026',
          supportEmail: 'support@forexbot.ai',
          supportTelegram: '@forexbot_support',
          defaultLanguage: 'ID',
          maintenanceMode: false,
          globalMinDeposit: 10.0,
          globalCommissionPct: 0.0,
          activeMenusJson: '[]',
          activePaymentGateway: 'MIDTRANS',
          midtransServerKey: 'SB-Mid-server-dnX0h4Vb3R4uWq7fP0l4t7e8',
          xenditApiKey: ''
        }
      });
    }
    return config;
  }
}

// Helper untuk mendekode Base32 (karena secret TOTP dalam format Base32)
function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const len = base32.length;
  const arr = [];

  for (let i = 0; i < len; i++) {
    const val = alphabet.indexOf(base32[i].toUpperCase());
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      arr.push((value >> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(arr);
}

// Fungsi verifikasi TOTP murni menggunakan HMAC-SHA1 bawaan Node.js
function verifyTOTP(token: string, secret: string): boolean {
  try {
    const key = base32Decode(secret);
    const epoch = Math.round(Date.now() / 1000);
    const timeStep = 30;
    const counter = Math.floor(epoch / timeStep);

    // Cek langkah waktu saat ini, sebelumnya, dan sesudahnya (toleransi waktu 30 detik)
    for (let i = -1; i <= 1; i++) {
      const c = counter + i;
      const buf = Buffer.alloc(8);
      let tmp = c;
      for (let j = 7; j >= 0; j--) {
        buf[j] = tmp & 0xff;
        tmp = tmp >> 8;
      }

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buf);
      const hmacResult = hmac.digest();

      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const code =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

      const otp = (code % 1000000).toString().padStart(6, '0');
      if (otp === token) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error verifying TOTP:', e);
  }
  return false;
}
