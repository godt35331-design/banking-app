import { IsString, IsInt, Min, Max, Length, IsOptional } from 'class-validator';

export class CreateCardDto {
  @IsString()
  label: string;

  @IsString()
  @Length(13, 19)
  cardNumber: string;

  @IsString()
  @Length(3, 4)
  cvv: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expMonth: number;

  @IsInt()
  @Min(2025)
  expYear: number;

  @IsString()
  holderName: string;

  @IsOptional()
  @IsString()
  walletId?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
