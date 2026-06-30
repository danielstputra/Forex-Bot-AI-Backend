import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class InboxService {
  constructor(private prisma: PrismaService) { }

  async getMessages(userId: string) {
    let messages = await this.prisma.userMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Auto-seed a welcome message if inbox is empty
    if (messages.length === 0) {
      await this.prisma.userMessage.createMany({
        data: [
          {
            userId,
            title: '🎉 Selamat Datang di Forex Bot AI!',
            content: 'Akun Anda telah berhasil dibuat dan siap digunakan. Mulailah dengan menghubungkan akun broker Anda di panel "Broker Connector", lalu aktifkan bot untuk memulai trading otomatis 24/7. Hubungi tim dukungan kami jika memerlukan bantuan.',
            isRead: false
          },
          {
            userId,
            title: '📋 Panduan KYC - Verifikasi Identitas',
            content: 'Untuk mengakses fitur withdrawal dan meningkatkan limit trading, harap lengkapi verifikasi KYC Anda. Unggah dokumen identitas resmi (KTP/Paspor) melalui menu "Security & KYC". Proses verifikasi biasanya membutuhkan waktu 1x24 jam kerja.',
            isRead: false
          },
          {
            userId,
            title: '🤖 Tips: Cara Mengoptimalkan Bot AI',
            content: 'Bot AI kami menggunakan kombinasi indikator MA Crossover, filter RSI, dan sentiment AI berita pasar. Untuk hasil terbaik, gunakan Risk Level "MODERATE" dan aktifkan News Filter di konfigurasi bot. Hindari menonaktifkan bot saat terjadi rilis data ekonomi penting (High Impact).',
            isRead: true
          }
        ]
      });

      messages = await this.prisma.userMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    return messages;
  }

  async markAsRead(userId: string, messageId: string) {
    return this.prisma.userMessage.updateMany({
      where: { id: messageId, userId },
      data: { isRead: true }
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.userMessage.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    return this.prisma.userMessage.deleteMany({
      where: { id: messageId, userId }
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.userMessage.count({
      where: { userId, isRead: false }
    });
    return { unreadCount: count };
  }
}
