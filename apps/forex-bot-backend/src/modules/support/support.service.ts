import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async getTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async createTicket(userId: string, body: any) {
    const { subject, category, description, priority } = body;
    if (!subject || !description) {
      throw new BadRequestException('subject and description are required.');
    }

    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject,
        category: category || 'GENERAL',
        description,
        priority: priority || 'MEDIUM',
        status: 'OPEN'
      }
    });
  }

  async getTicketMessages(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId }
    });
    if (!ticket) {
      throw new BadRequestException('Ticket not found or unauthorized.');
    }

    const messages = await this.prisma.ticketMessage.findMany({
      where: { ticketId },
      include: {
        sender: {
          select: {
            legalName: true,
            customRole: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return messages.map((m: any) => ({
      ...m,
      sender: {
        legalName: m.sender?.legalName,
        role: m.sender?.customRole?.name || 'USER'
      }
    }));
  }

  async sendTicketMessage(userId: string, ticketId: string, body: any) {
    const { message } = body;
    if (!message) {
      throw new BadRequestException('message is required.');
    }

    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId }
    });
    if (!ticket) {
      throw new BadRequestException('Ticket not found or unauthorized.');
    }

    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.ticketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message
        }
      });

      // Update ticket status to OPEN (if it was resolved/closed, user reply reopens it)
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', updatedAt: new Date() }
      });

      return msg;
    });
  }

  async getArticles() {
    let articles = await this.prisma.knowledgeBaseArticle.findMany();
    
    // Seed default articles if none exist
    if (articles.length === 0) {
      const defaults = [
        {
          category: 'Trading',
          title: 'Cara Menghubungkan Akun Broker MT4/MT5',
          content: 'Untuk menghubungkan akun broker, masuk ke dashboard utama dan temukan panel "Broker Connector". Masukkan nama broker, nomor akun login, sandi master, dan server broker Anda. Sandi Anda akan dienkripsi secara aman menggunakan enkripsi AES-256-GCM.'
        },
        {
          category: 'Billing',
          title: 'Bagaimana cara melakukan deposit dana?',
          content: 'Pilih tab "Fintech Hub" lalu klik "Multi-Currency Wallet". Pilih mata uang (USD, USDT, atau BTC) dan masukkan jumlah deposit. Unggah bukti fisik transfer Anda. Admin kami akan memverifikasi dan menyetujui transaksi Anda dalam waktu kurang dari 10 menit.'
        },
        {
          category: 'General',
          title: 'Apa itu PAMM / MAM Pool?',
          content: 'PAMM (Percent Allocation Management Module) memungkinkan Fund Manager profesional untuk mengelola dana dari banyak investor dalam satu pool tunggal. Keuntungan dan kerugian dibagi secara proporsional sesuai rasio alokasi modal investor.'
        }
      ];

      for (const d of defaults) {
        await this.prisma.knowledgeBaseArticle.create({ data: d });
      }
      articles = await this.prisma.knowledgeBaseArticle.findMany();
    }

    return articles;
  }
}
