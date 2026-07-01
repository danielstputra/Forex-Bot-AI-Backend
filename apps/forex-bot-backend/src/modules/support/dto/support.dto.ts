import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;
}

export class SendTicketMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
