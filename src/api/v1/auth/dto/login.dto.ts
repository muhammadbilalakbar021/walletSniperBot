import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class loginDto {
  @IsString()
  @IsNotEmpty()
  xaccount: string;

  @IsString()
  @IsNotEmpty()
  mnemonic: string;
}
