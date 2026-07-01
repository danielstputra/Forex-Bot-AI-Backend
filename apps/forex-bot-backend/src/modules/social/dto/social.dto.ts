import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class StartCopyingDto {
  @IsNumber()
  @Min(1)
  allocationPercent!: number;

  @IsString()
  @IsOptional()
  riskMode?: string;
}
