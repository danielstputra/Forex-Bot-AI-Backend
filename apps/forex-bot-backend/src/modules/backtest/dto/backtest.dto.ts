import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class SaveBacktestResultDto {
  @IsString()
  @IsNotEmpty()
  strategyId!: string;

  @IsString()
  @IsNotEmpty()
  pair!: string;

  @IsString()
  @IsNotEmpty()
  timeframe!: string;

  @IsNumber()
  totalTrades!: number;

  @IsNumber()
  winRate!: number;

  @IsNumber()
  profitFactor!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
