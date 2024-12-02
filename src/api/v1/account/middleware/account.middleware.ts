import { Injectable, NestMiddleware } from '@nestjs/common';
import * as Joi from 'joi';
//import { ConsoleService } from '../../../../utils/console/console.service';
//import { ResponseService } from '../../../../utils/response/response.service';
import { ConsoleService } from '../../../../utils/console/console.service';
import { ResponseService } from '../../../../utils/response/response.service';
@Injectable()
export class AccountMiddleware implements NestMiddleware {
  constructor(
    private responseService: ResponseService,
    private readonly consoleService: ConsoleService,
  ) {}

  use(req: any, res: any, next: () => void) {
    try {
      const schema = Joi.object().keys({
        xaccount: Joi.string().optional(),
        isBlacklisted: Joi.boolean().optional(),
      });
      const { error } = schema.validate(req.body, {
        abortEarly: false,
      });

      if (error)
        return this.responseService.badRequestResponse(
          error.details[0].message,
          res,
        );
    } catch (error) {
      return this.responseService.serverFailureResponse(error.message, res);
    }
  }
}
