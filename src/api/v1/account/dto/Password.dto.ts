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

export class PasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  password: string;
}
