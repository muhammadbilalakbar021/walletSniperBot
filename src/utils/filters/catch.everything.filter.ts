import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.BAD_REQUEST;
    const responseBody = {
      message:
        exception?.detail?.replace(/\(/g, '').replace(/\)/g, '') ||
        exception?.response?.message ||
        exception?.message ||
        exception?.error ||
        exception?.err ||
        'Request Failed!',
    };

    console.log('Error is here: ' + responseBody.toString());
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
