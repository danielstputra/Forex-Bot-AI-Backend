import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class RequestPayoutDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  bankAccount!: string;
}
