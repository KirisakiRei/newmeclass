import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBridgeTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  target?: string;
}
