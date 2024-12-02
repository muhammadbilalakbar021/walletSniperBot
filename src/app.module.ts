import { TwofaModule } from './api/v1/2fa/2fa.module';
import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResponseService } from './utils/response/response.service';
import { ConsoleService } from './utils/console/console.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AccountModule } from './api/v1/account/account.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SendMail } from './utils/sendgrid/sendMail.utils';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtGuard } from './api/v1/auth/guard/jwt.guard';
import { AuthModule } from './api/v1/auth/auth.module';
import { Web3Module } from './api/v1/web3/web3.module';
import { JwtStrategy } from './api/v1/auth/guard/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from './config/config.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AccountModule,
    ConfigModule,
    DatabaseModule,
    SendMail,
    AuthModule,
    Web3Module,
    TwofaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.JWT_TOKEN,
        signOptions: { expiresIn: configService.JWT_EXPIRY_TIME },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResponseService,
    ConsoleService,
    SendMail,
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    JwtStrategy,
  ],
})
export class AppModule {}
