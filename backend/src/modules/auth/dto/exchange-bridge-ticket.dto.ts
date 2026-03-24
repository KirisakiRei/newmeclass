import { IsString, MaxLength } from 'class-validator';

export class ExchangeBridgeTicketDto {
  @IsString()
  @MaxLength(255)
  ticket!: string;
}
