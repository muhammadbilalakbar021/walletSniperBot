import { HttpStatus, Injectable, Res } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class ResponseService {
  successResponse(status = false, result, @Res() res: Response) {
    if (status !== false) {
      res.status(HttpStatus.OK).json({
        status: true,
        statusCode: 200,
        message: 'success',
        payload: result,
      });
    } else {
      res.status(HttpStatus.OK).json({
        status: false,
        statusCode: 200,
        message: 'No Data Found!',
        payload: null,
      });
    }
  }

  badRequestResponse(result, @Res() res: Response) {
    res.status(HttpStatus.BAD_REQUEST).json({
      status: false,
      statusCode: HttpStatus.BAD_REQUEST,
      message: result,
      payload: result,
    });
  }

  serverFailureResponse(result, @Res() res: Response) {
    res.status(HttpStatus.BAD_REQUEST).json({
      status: false,
      statusCode: HttpStatus.BAD_REQUEST,
      message: result,
      payload: result,
    });
  }

  dbError(result: string, @Res() res: Response): any {
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: false,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'DB_ERROR',
      payload: result,
    });
  }
}
