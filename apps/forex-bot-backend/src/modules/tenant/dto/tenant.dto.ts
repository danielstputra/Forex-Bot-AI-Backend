import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UpdateThemeDto {
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @IsString()
  @IsOptional()
  fontFamily?: string;
}

export class CreateTenantSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsNumber()
  durationMonths!: number;
}
