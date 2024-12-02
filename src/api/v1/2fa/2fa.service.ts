import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toFileStream, toDataURL } from 'qrcode';
import { SendMail } from '../../../utils/sendgrid/sendMail.utils';

@Injectable()
export class TwofaService {
  constructor(private sendGrid: SendMail) {}

  public async generateTwoFactorAuthenticationSecret(
    user,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user, 'Zah Admin 2fa', secret);
    return {
      secret,
      otpauthUrl,
    };
  }

  public async pipeQrCodeStream(email, secret, otpauthUrl: string) {
    const qrCode = await toDataURL(otpauthUrl);
    return await this.sendGrid.sendQrCode(email, qrCode, secret);
  }

  public isTwoFactorAuthenticationCodeValid(token, secret): boolean {
    return authenticator.verify({
      token, //code
      secret, //saved secret of user
    });
  }
}
