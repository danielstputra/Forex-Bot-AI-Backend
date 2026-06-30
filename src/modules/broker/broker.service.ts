import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { encrypt } from '../../core/utils/crypto.util';

@Injectable()
export class BrokerService {
  constructor(private prisma: PrismaService) {}

  async linkAccount(userId: string, body: any) {
    const { brokerName, accountNumber, password, serverAddress, leverage } = body;
    if (!brokerName || !accountNumber || !password || !serverAddress) {
      throw new BadRequestException('brokerName, accountNumber, password, and serverAddress are required.');
    }

    const existing = await this.prisma.brokerAccount.findUnique({ where: { accountNumber } });
    if (existing) throw new BadRequestException('Broker account number is already linked.');

    const passwordCipher = encrypt(password);

    const account = await this.prisma.brokerAccount.create({
      data: {
        userId,
        brokerName,
        accountNumber,
        passwordCipher,
        serverAddress,
        leverage: leverage ? parseInt(leverage) : 500,
        balance: 10000.00,
        equity: 10000.00,
        status: 'CONNECTED'
      }
    });

    // GAP 4: Write BrokerSyncLog on successful connection
    await this.prisma.brokerSyncLog.create({
      data: {
        brokerAccountId: account.id,
        status: 'SUCCESS'
      }
    });

    return account;
  }

  async syncAccount(userId: string, accountId: string) {
    const account = await this.prisma.brokerAccount.findFirst({
      where: { id: accountId, userId }
    });
    if (!account) throw new BadRequestException('Broker account not found.');

    // Simulate sync
    const syncSuccess = Math.random() > 0.1; // 90% success rate mock

    await this.prisma.brokerSyncLog.create({
      data: {
        brokerAccountId: account.id,
        status: syncSuccess ? 'SUCCESS' : 'FAILED',
        errorMessage: syncSuccess ? null : 'Connection timeout to broker server.'
      }
    });

    if (syncSuccess) {
      // Update balance mock
      await this.prisma.brokerAccount.update({
        where: { id: account.id },
        data: { status: 'CONNECTED', updatedAt: new Date() }
      });
    }

    return {
      status: syncSuccess ? 'SUCCESS' : 'FAILED',
      message: syncSuccess ? 'Account synced successfully.' : 'Sync failed. Check broker credentials.'
    };
  }

  async getSyncLogs(userId: string, accountId: string) {
    const account = await this.prisma.brokerAccount.findFirst({
      where: { id: accountId, userId }
    });
    if (!account) throw new BadRequestException('Broker account not found.');

    return this.prisma.brokerSyncLog.findMany({
      where: { brokerAccountId: accountId },
      orderBy: { syncedAt: 'desc' },
      take: 20
    });
  }

  async getAccounts(userId: string) {
    return this.prisma.brokerAccount.findMany({
      where: { userId },
      select: {
        id: true,
        brokerName: true,
        accountNumber: true,
        leverage: true,
        balance: true,
        equity: true,
        status: true,
        createdAt: true
      }
    });
  }
}
