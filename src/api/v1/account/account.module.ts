import { TwofaModule } from './../2fa/2fa.module';
import { JwtEntity, JwtSchema } from '../auth/entity/jwt.entity';
import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { ConsoleService } from '../../../utils/console/console.service';
import { ResponseService } from '../../../utils/response/response.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountService } from './service/account.service';
import { AccountSchema, AccountEntity } from './entity/account.entity';
import { AccountMiddleware } from './middleware/account.middleware';
import { BodyMiddleware } from './middleware/body.middleware';
import { ParamMiddleware } from './middleware/param.middleware';
import { AccountController } from './controller/account.controller';
import { ConfigService } from '../../../config/config.service';
import { isNotAccountExists } from './middleware/isNotAccount.middleware';
import { JwtModule } from '@nestjs/jwt';
import {
  AdminAccountEntity,
  AdminAccountSchema,
} from './entity/adminAccount.entity';
import { SendMail } from '../../../utils/sendgrid/sendMail.utils';
import { AuthModule } from '../auth/auth.module';
import { accountAlreadyExists } from './middleware/accountAlreadyExists.middleware';
import { isAccountVerified } from './middleware/isAccountVerified.middleware';
import { DatabaseModule } from '../../../database/database.module';
import { Web3Module } from '../web3/web3.module';
import { S3StorageModule } from '../S3/s3.module';
import { S3Service } from '../S3/service/s3.service';

const confiService = new ConfigService();

@Module({
  imports: [
    AuthModule,
    SendMail,
    DatabaseModule,
    TwofaModule,
    Web3Module,
    JwtModule,
  ],
  providers: [
    ResponseService,
    ConsoleService,
    AccountService,
    DatabaseModule,
    S3Service,
    SendMail,
  ],
  exports: [AccountService],
  controllers: [AccountController],
})
export class AccountModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(isNotAccountExists).forRoutes({
      path: 'account/forgot-password',
      method: RequestMethod.POST,
    });
    consumer.apply(isNotAccountExists, isAccountVerified).forRoutes({
      path: 'account/sign-in',
      method: RequestMethod.POST,
    });

    // consumer.apply(accountAlreadyExists).forRoutes({
    //   path: 'account/sign-up',
    //   method: RequestMethod.POST,
    // });
  }
}
