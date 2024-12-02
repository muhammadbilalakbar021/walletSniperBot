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
  Min,
  Matches,
} from 'class-validator';

export class MasterWalletDto {
  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @IsNotEmpty()
  @IsString()
  authCode: string;
}
