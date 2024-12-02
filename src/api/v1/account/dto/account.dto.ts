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

export class accountDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(30)
  @MaxLength(42)
  address: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(100)
  @MaxLength(132)
  signature: string;
}
