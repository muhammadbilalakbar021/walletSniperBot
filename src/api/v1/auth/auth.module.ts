import { Module } from '@nestjs/common';
import { AuthService } from './service/auth.service';
import { ConsoleService } from '../../../utils/console/console.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../../config/config.service';
import * as dotenv from 'dotenv';
import { AuthController } from './controllers/auth.controller';
import { ResponseService } from '../../../utils/response/response.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountSchema, AccountEntity } from '../account/entity/account.entity';
import { JwtEntity, JwtSchema } from './entity/jwt.entity';
import { JwtStrategy } from './guard/jwt.strategy';
import {
  AdminAccountEntity,
  AdminAccountSchema,
} from '../account/entity/adminAccount.entity';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [JwtModule, PassportModule, DatabaseModule],
  providers: [AuthService, ConsoleService, ResponseService, JwtStrategy],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {
  constructor(private readonly configService: ConfigService) {}
}
