import { Controller, Get, Req, Post, Body, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { RealIP } from 'nestjs-real-ip';
import { Public } from './utils/decorators/public.decorator';
import { ResponseService } from './utils/response/response.service';
import { SendMail } from './utils/sendgrid/sendMail.utils';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private responseService: ResponseService,
    private readonly sendGridService: SendMail,
  ) {}

  @Public()
  @Get()
  getHello(@Req() req: any): string {
    return 'Hello World!';
  }

  @Public()
  @Post('/send-transak-email')
  async sendOrderEmailTransak(@Body() body, @Res() res) {
    const { email, orderData } = body;
    try {
      const mailSent = await this.sendGridService.sendOrderDetailsTransak(
        email,
        orderData,
      );

      this.responseService.successResponse(true, mailSent, res);
    } catch (error: any) {
      console.log(error?.response?.data, 'error');

      return this.responseService.serverFailureResponse(
        error?.response?.data,
        res,
      );
    }
  }

  @Public()
  @Post()
  getHsasello(@Req() req: any): string {
    return 'Hello World!';
  }
}
