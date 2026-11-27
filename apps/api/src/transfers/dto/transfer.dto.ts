import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

enum TransferType {
  LOCAL = 'TRANSFER_LOCAL',
  INTERNATIONAL = 'TRANSFER_INTL',
}

export class CreateTransferDto {
  @IsString()
  walletId: string;

  @IsEnum(TransferType)
  type: TransferType;

  @IsInt()
  @Min(1)
  amountMinor: number;

  @IsString()
  recipientName: string;

  @IsString()
  recipientAccount: string;

  @IsOptional()
  @IsString()
  recipientBank?: string;

  @IsOptional()
  @IsString()
  swiftCode?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
