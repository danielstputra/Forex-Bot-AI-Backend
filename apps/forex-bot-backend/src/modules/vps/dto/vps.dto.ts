import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ProvisionVpsDto {
  @IsString()
  @IsNotEmpty()
  plan!: string;

  @IsString()
  @IsOptional()
  region?: string;
}
