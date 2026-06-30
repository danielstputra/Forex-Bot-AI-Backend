import { Injectable } from '@nestjs/common';

export interface BrokerOrderResult {
  success: boolean;
  ticketId?: string;
  rawPayload: string;
  errorMessage?: string;
}

export interface BrokerAccountDetails {
  balance: number;
  equity: number;
}

export interface IBrokerApiClient {
  placeOrder(params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    lotSize: number;
    price: number;
  }): Promise<BrokerOrderResult>;

  closeOrder(ticketId: string, params: {
    symbol: string;
    price: number;
  }): Promise<BrokerOrderResult>;

  getAccountDetails(): Promise<{ success: boolean; data?: BrokerAccountDetails; errorMessage?: string }>;
}

export class OandaBrokerApiClient implements IBrokerApiClient {
  constructor(
    private accountNumber: string,
    private apiKey: string,
    private isLive: boolean = false
  ) {}

  private get baseUrl() {
    return this.isLive
      ? 'https://api-fxtrade.oanda.com/v3'
      : 'https://api-fxpractice.oanda.com/v3';
  }

  async getAccountDetails(): Promise<{ success: boolean; data?: BrokerAccountDetails; errorMessage?: string }> {
    if (!this.apiKey || this.apiKey === 'mock' || this.apiKey.startsWith('mock_')) {
      throw new Error('OANDA API Key is required. Simulation mode is disabled.');
    }
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${this.accountNumber}/summary`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, errorMessage: data.errorMessage || 'Failed to fetch OANDA account summary.' };
      }
      const summary = data.account;
      return {
        success: true,
        data: {
          balance: parseFloat(summary.balance),
          equity: parseFloat(summary.NAV),
        },
      };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  async placeOrder(params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    lotSize: number;
    price: number;
  }): Promise<BrokerOrderResult> {
    const symbolFormatted = params.symbol.replace('/', '_'); // OANDA uses EUR_USD
    const units = Math.round(params.lotSize * 100000 * (params.type === 'BUY' ? 1 : -1));

    if (!this.apiKey || this.apiKey === 'mock' || this.apiKey.startsWith('mock_')) {
      throw new Error('OANDA API Key is required for real-time order execution. Simulation mode is disabled.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/accounts/${this.accountNumber}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          order: {
            units: units.toString(),
            instrument: symbolFormatted,
            timeInForce: 'FOK',
            type: 'MARKET',
            positionFill: 'DEFAULT',
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          rawPayload: JSON.stringify(data),
          errorMessage: data.errorMessage || 'Failed to place order with OANDA.',
        };
      }

      const ticketId = data.orderFillTransaction?.id || data.orderCreateTransaction?.id;
      return {
        success: true,
        ticketId: ticketId ? `OA-${ticketId}` : undefined,
        rawPayload: JSON.stringify(data),
      };
    } catch (err: any) {
      return {
        success: false,
        rawPayload: JSON.stringify({ error: err.message }),
        errorMessage: err.message,
      };
    }
  }

  async closeOrder(ticketId: string, params: {
    symbol: string;
    price: number;
  }): Promise<BrokerOrderResult> {
    const oandaTradeId = ticketId.replace(/^OA-/, '');

    if (!this.apiKey || this.apiKey === 'mock' || this.apiKey.startsWith('mock_')) {
      throw new Error('OANDA API Key is required for real-time order execution. Simulation mode is disabled.');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${this.accountNumber}/trades/${oandaTradeId}/close`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            units: 'ALL',
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          rawPayload: JSON.stringify(data),
          errorMessage: data.errorMessage || 'Failed to close trade with OANDA.',
        };
      }

      return {
        success: true,
        rawPayload: JSON.stringify(data),
      };
    } catch (err: any) {
      return {
        success: false,
        rawPayload: JSON.stringify({ error: err.message }),
        errorMessage: err.message,
      };
    }
  }
}

export class MetaTraderBrokerApiClient implements IBrokerApiClient {
  constructor(
    private accountNumber: string,
    private apiPasswordCipher: string,
    private serverAddress: string
  ) {}

  async getAccountDetails(): Promise<{ success: boolean; data?: BrokerAccountDetails; errorMessage?: string }> {
    if (!this.serverAddress || !this.accountNumber) {
      throw new Error('MetaTrader 5 Server Address and Account Number are required.');
    }
    try {
      const response = await fetch(`${this.serverAddress}/api/account/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiPasswordCipher}`
        },
        body: JSON.stringify({
          login: this.accountNumber,
        })
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, errorMessage: data.comment || 'Failed to fetch MT5 account details.' };
      }
      return {
        success: true,
        data: {
          balance: parseFloat(data.balance || 0),
          equity: parseFloat(data.equity || data.balance || 0),
        },
      };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  async placeOrder(params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    lotSize: number;
    price: number;
  }): Promise<BrokerOrderResult> {
    console.log(`[MT5 WebAPI] Placing real order on server ${this.serverAddress} for account ${this.accountNumber}`);
    
    if (!this.serverAddress || !this.accountNumber) {
      throw new Error('MetaTrader 5 Server Address and Account Number are required for real-time execution.');
    }

    try {
      const response = await fetch(`${this.serverAddress}/api/trade/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiPasswordCipher}`
        },
        body: JSON.stringify({
          login: this.accountNumber,
          symbol: params.symbol,
          action: params.type === 'BUY' ? 'BUY' : 'SELL',
          volume: params.lotSize,
          price: params.price
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          rawPayload: JSON.stringify(data),
          errorMessage: data.comment || 'Failed to place order with MT5 WebAPI.'
        };
      }

      return {
        success: true,
        ticketId: `MT5-${data.order || data.position}`,
        rawPayload: JSON.stringify(data)
      };
    } catch (err: any) {
      return {
        success: false,
        rawPayload: JSON.stringify({ error: err.message }),
        errorMessage: err.message
      };
    }
  }

  async closeOrder(ticketId: string, params: {
    symbol: string;
    price: number;
  }): Promise<BrokerOrderResult> {
    console.log(`[MT5 WebAPI] Closing real trade ${ticketId} on server ${this.serverAddress}`);
    const mt5PositionId = ticketId.replace(/^MT5-/, '');

    try {
      const response = await fetch(`${this.serverAddress}/api/trade/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiPasswordCipher}`
        },
        body: JSON.stringify({
          login: this.accountNumber,
          position: mt5PositionId,
          price: params.price
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          rawPayload: JSON.stringify(data),
          errorMessage: data.comment || 'Failed to close trade with MT5 WebAPI.'
        };
      }

      return {
        success: true,
        rawPayload: JSON.stringify(data)
      };
    } catch (err: any) {
      return {
        success: false,
        rawPayload: JSON.stringify({ error: err.message }),
        errorMessage: err.message
      };
    }
  }
}

export class BrokerApiClientFactory {
  static getClient(account: {
    brokerName: string;
    accountNumber: string;
    passwordCipher: string;
    serverAddress: string;
  }): IBrokerApiClient {
    const nameUpper = account.brokerName.toUpperCase();
    if (nameUpper.includes('OANDA')) {
      return new OandaBrokerApiClient(account.accountNumber, account.passwordCipher, false);
    } else {
      return new MetaTraderBrokerApiClient(
        account.accountNumber,
        account.passwordCipher,
        account.serverAddress
      );
    }
  }
}
