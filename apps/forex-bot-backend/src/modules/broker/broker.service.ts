import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { encrypt } from '../../core/utils/crypto.util';
import { BrokerApiClientFactory } from '@app/shared';

@Injectable()
export class BrokerService {
  constructor(private prisma: PrismaService) {}

  async linkAccount(userId: string, body: any) {
    const { brokerName, accountNumber, password, passwordCipher, serverAddress, leverage } = body;
    const finalPassword = password || passwordCipher;

    if (!brokerName || !accountNumber || !finalPassword || !serverAddress) {
      throw new BadRequestException('brokerName, accountNumber, password, and serverAddress are required.');
    }

    const existing = await this.prisma.brokerAccount.findUnique({ where: { accountNumber } });
    if (existing) throw new BadRequestException('Broker account number is already linked.');

    const encryptedPassword = encrypt(finalPassword);

    const account = await this.prisma.brokerAccount.create({
      data: {
        userId,
        brokerName,
        accountNumber,
        passwordCipher: encryptedPassword,
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

    const client = BrokerApiClientFactory.getClient({
      brokerName: account.brokerName,
      accountNumber: account.accountNumber,
      passwordCipher: account.passwordCipher,
      serverAddress: account.serverAddress || '',
    });

    const res = await client.getAccountDetails();

    await this.prisma.brokerSyncLog.create({
      data: {
        brokerAccountId: account.id,
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? null : res.errorMessage || 'Unknown broker error.'
      }
    });

    if (res.success && res.data) {
      await this.prisma.brokerAccount.update({
        where: { id: account.id },
        data: {
          status: 'CONNECTED',
          balance: res.data.balance,
          equity: res.data.equity,
          updatedAt: new Date()
        }
      });
    }

    return {
      status: res.success ? 'SUCCESS' : 'FAILED',
      message: res.success ? 'Account synced successfully.' : `Sync failed: ${res.errorMessage}`
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
