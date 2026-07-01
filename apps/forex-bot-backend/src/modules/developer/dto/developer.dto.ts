import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
