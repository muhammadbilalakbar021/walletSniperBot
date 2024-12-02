/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsNotEmpty,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  IsDate,
  IsDecimal,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class changePasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  confirmPassword: string;
}
