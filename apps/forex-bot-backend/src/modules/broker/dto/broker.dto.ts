import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class LinkBrokerDto {
  @IsString()
  @IsNotEmpty()
  brokerName!: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  apiSecret?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  passwordCipher?: string;

  @IsString()
  @IsOptional()
  serverAddress?: string;

  @IsNumber()
  @IsOptional()
  leverage?: number;
}
