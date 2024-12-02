import { Module } from '@nestjs/common';
import { TwofaService } from './2fa.service';
import { TwofaController } from './2fa.controller';
import { SendMail } from '../../../utils/sendgrid/sendMail.utils';

@Module({
  controllers: [TwofaController],
  providers: [TwofaService, SendMail],
  exports: [TwofaService],
})
export class TwofaModule {}
