import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LinkBrokerDto {
  @IsString()
  @IsNotEmpty()
  brokerName!: string;

  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  apiSecret?: string;
}
