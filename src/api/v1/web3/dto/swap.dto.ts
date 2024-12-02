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
} from 'class-validator';

export class swapDto {
  @IsNotEmpty()
  @IsString()
  tokenMintAddress: string;

  @IsNotEmpty()
  @IsString()
  solanaAddress: string;

  @IsNotEmpty()
  @IsString()
  lpPairAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  tokenAAmount: number;
}
