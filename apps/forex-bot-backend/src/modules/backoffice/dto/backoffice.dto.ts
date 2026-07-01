import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateAppConfigDto {
  @IsString()
  @IsOptional()
  appName?: string;

  @IsString()
  @IsOptional()
  supportEmail?: string;

  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;
}

export class CreateSystemMenuDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateSystemMenuDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  price!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsNumber()
  durationDays!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSubscriptionPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
