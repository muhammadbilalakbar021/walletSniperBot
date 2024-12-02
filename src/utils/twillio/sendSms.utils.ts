import { Injectable } from '@nestjs/common';
import client = require('twilio');
import { ConfigService } from '../../config/config.service';

@Injectable()
export class SendSms {
  constructor(private readonly config: ConfigService) { }
  private twilio = client(
    '',
    '',
  );

  async sendSms(to: string, code: number) {
    // sgMail.setApiKey(this.config.sendgridApiKey);
    const message = {
      body: `Verification Code is: ${code}`,
      from: '+12396454347',
      to,
    };

    try {
      return await this.twilio.messages.create(message);
    } catch (error) {
      // throw error;
    }
  }
}
