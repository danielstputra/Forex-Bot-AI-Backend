import { IsString, IsNumber, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class DepositDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  method!: string;
}

export class WithdrawalDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  method!: string;

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
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsNumber()
  amount!: number;
}
