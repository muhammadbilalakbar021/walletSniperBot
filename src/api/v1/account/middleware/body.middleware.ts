import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ResponseService } from '../../../../utils/response/response.service';
const responseService = new ResponseService();

@Injectable()
export class BodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
      return responseService.badRequestResponse('Body Not Defined', res);
    }
    next();
  }
}
