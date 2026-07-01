import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePoolDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  targetReturn!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateAllocationDto {
  @IsNumber()
  @Min(0)
  investorId!: string;

  @IsNumber()
  @Min(0)
  allocationPercent!: number;
}
