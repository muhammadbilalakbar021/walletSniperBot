/* eslint-disable @typescript-eslint/no-unused-vars */
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class userLimitDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  limit: number;
}
