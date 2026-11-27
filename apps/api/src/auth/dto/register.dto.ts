import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

/** Emails are compared without caring about capitals or stray spaces ("Mbah@x.com " = "mbah@x.com"). */
export const normalizeEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Enter your full name' })
  @MaxLength(120, { message: 'That name is too long' })
  @Matches(/^[^<>{}\\]*$/, { message: 'Your name contains characters that are not allowed' })
  name: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be 128 characters or fewer' })
  @Matches(/[A-Za-z]/, { message: 'Password must contain at least one letter' })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'Your PIN must be exactly 4 digits' })
  @Matches(/^(?!(\d)\1{3}$)(?!0123$|1234$|2345$|3456$|4567$|5678$|6789$|9876$|8765$|7654$|6543$|5432$|4321$|3210$)\d{4}$/, {
    message: 'Choose a PIN that is harder to guess (not 1111 or 1234)',
  })
  pin: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^$|^\+?[\d\s().-]{6,24}$/, { message: 'Enter a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  captchaToken?: string;
}
