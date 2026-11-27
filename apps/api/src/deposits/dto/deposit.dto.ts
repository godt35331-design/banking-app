import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

enum DepositType {
  BANK = 'DEPOSIT_BANK',
  CHECK = 'DEPOSIT_CHECK',
  CASH = 'DEPOSIT_CASH',
}

export class CreateDepositDto {
  @IsString()
  walletId: string;

  @IsEnum(DepositType)
  type: DepositType;

  @IsInt()
  @Min(1)
  amountMinor: number;

  @IsOptional()
  @IsString()
  sourceBank?: string;

  @IsOptional()
  @IsString()
  checkNumber?: string;

  @IsOptional()
  @IsString()
  cashCode?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
