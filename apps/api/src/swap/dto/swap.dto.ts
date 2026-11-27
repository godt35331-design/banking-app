import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateSwapDto {
  @IsString()
  fromWalletId: string;

  @IsEnum(Currency)
  toCurrency: Currency;

  @IsInt()
  @Min(1)
  amountMinor: number;
}
