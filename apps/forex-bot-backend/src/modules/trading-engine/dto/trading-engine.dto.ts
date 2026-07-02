import { IsString, IsNumber, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  @IsOptional()
  pair?: string;

  @IsString()
  @IsOptional()
  timeframe?: string;

  @IsString()
  @IsOptional()
  strategy?: string;

  @IsNumber()
  @IsOptional()
  lotSize?: number;

  @IsNumber()
  @IsOptional()
  stopLoss?: number;

  @IsNumber()
  @IsOptional()
  takeProfit?: number;

  @IsNumber()
  @IsOptional()
  riskTolerance?: number;

  @IsNumber()
  @IsOptional()
  lotMultiplier?: number;

  @IsNumber()
  @IsOptional()
  maxDrawdown?: number;

  @IsOptional()
  newsFilterOn?: boolean;

  @IsOptional()
  useSentiment?: boolean;
}

export class ExecuteOrderDto {
  @IsString()
  @IsNotEmpty()
  pair!: string;

  @IsString()
  @IsNotEmpty()
  type!: string; // BUY or SELL

  @IsNumber()
  @Min(0.01)
  lotSize!: number;

  @IsNumber()
  @IsOptional()
  stopLoss?: number;

  @IsNumber()
  @IsOptional()
  takeProfit?: number;
}

export class GenerateLicenseDto {
  @IsString()
  @IsNotEmpty()
  strategyId!: string;

  @IsNumber()
  @Min(1)
  durationDays!: number;
}
