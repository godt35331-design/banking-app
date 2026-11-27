import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { EMPLOYMENT_STATUSES, TAX_COUNTRIES } from '@kestrel/shared';

/** Sent as multipart/form-data together with the six document files. */
export class CreateTaxRecoveryDto {
  @IsIn(TAX_COUNTRIES.map(c => c.code))
  country: string;

  @IsString()
  @Length(2, 120)
  legalName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @Length(2, 120)
  addressLine1: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  addressLine2?: string;

  @IsString()
  @Length(1, 80)
  city: string;

  @IsString()
  @Length(2, 16)
  postcode: string;

  @IsString()
  @Length(5, 24)
  taxIdNumber: string;

  @IsIn(EMPLOYMENT_STATUSES.map(s => s.value))
  employmentStatus: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  taxYear: number;
}

export class ReviewTaxRecoveryDto {
  @IsIn(['UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @Length(0, 500)
  reviewNote?: string;
}

export class PayTaxRefundDto {
  @IsString()
  walletId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountMinor: number;
}
