import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateAppConfigDto {
  @IsString()
  @IsOptional()
  appName?: string;

  @IsString()
  @IsOptional()
  appDescription?: string;

  @IsString()
  @IsOptional()
  backendUrl?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;

  @IsString()
  @IsOptional()
  appUrl?: string;

  @IsString()
  @IsOptional()
  appKey?: string;

  @IsString()
  @IsOptional()
  supportEmail?: string;

  @IsString()
  @IsOptional()
  supportTelegram?: string;

  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @IsNumber()
  @IsOptional()
  globalMinDeposit?: number;

  @IsNumber()
  @IsOptional()
  globalCommissionPct?: number;

  @IsArray()
  @IsOptional()
  activeMenus?: string[];

  @IsBoolean()
  @IsOptional()
  loginOtpEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  smtpEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  oauthEnabled?: boolean;

  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsNumber()
  @IsOptional()
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPass?: string;

  @IsString()
  @IsOptional()
  smtpSender?: string;

  @IsString()
  @IsOptional()
  googleClientId?: string;

  @IsString()
  @IsOptional()
  activePaymentGateway?: string;

  @IsString()
  @IsOptional()
  midtransServerKey?: string;

  @IsString()
  @IsOptional()
  xenditApiKey?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankRecipientName?: string;
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
