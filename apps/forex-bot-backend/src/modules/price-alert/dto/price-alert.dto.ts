import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';

export enum AlertCondition {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
}

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsEnum(AlertCondition)
  condition!: AlertCondition;

  @IsNumber()
  targetPrice!: number;
}
