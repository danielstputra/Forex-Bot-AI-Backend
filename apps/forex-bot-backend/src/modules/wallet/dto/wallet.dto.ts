import { IsString, IsNumber, IsNotEmpty, IsOptional, Min, IsEnum } from 'class-validator';

export enum PaymentMethod {
  // QRIS Universal
  QRIS = 'QRIS',
  // E-Wallet via Midtrans
  GOPAY = 'GOPAY',
  SHOPEEPAY = 'SHOPEEPAY',
  // E-Wallet via Xendit
  DANA = 'DANA',
  OVO = 'OVO',
  LINKAJA = 'LINKAJA',
  // Virtual Account via Midtrans
  VA_BCA = 'VA_BCA',
  VA_MANDIRI = 'VA_MANDIRI',
  VA_BNI = 'VA_BNI',
  VA_BRI = 'VA_BRI',
  VA_CIMB = 'VA_CIMB',
  VA_PERMATA = 'VA_PERMATA',
  // Retail
  ALFAMART = 'ALFAMART',
  INDOMARET = 'INDOMARET',
  // Manual & Crypto
  BANK_TRANSFER = 'BANK_TRANSFER',
  CRYPTO = 'CRYPTO',
}

export class DepositDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}

export class WithdrawalDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @IsOptional()
  accountDetails?: string;
}

export class MidtransWebhookDto {
  @IsString()
  @IsNotEmpty()
  order_id!: string;

  @IsString()
  @IsNotEmpty()
  transaction_status!: string;

  @IsString()
  @IsNotEmpty()
  gross_amount!: string;
}

export class XenditWebhookDto {
  @IsString()
  @IsOptional()
  event?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;
}
