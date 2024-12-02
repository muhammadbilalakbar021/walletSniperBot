import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';
import { requestFromContext } from '../../../../utils/request/request-from-context';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccountEntity,
  AccountDocument,
} from '../../account/entity/account.entity';
import {
  AdminAccountDocument,
  AdminAccountEntity,
} from '../../account/entity/adminAccount.entity';
import { JwtPayload } from '../interface/jwt-payload.interface';
import { jwtTypeEnum, rolesTypeEnum } from '../../../../utils/misc/enums';
import { JwtDocument, JwtEntity } from '../entity/jwt.entity';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(AccountEntity.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(AdminAccountEntity.name)
    private readonly adminModel: Model<AdminAccountDocument>,
    @InjectModel(JwtEntity.name)
    private readonly authModel: Model<JwtDocument>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    //Get Request..
    const request = this.getRequest(context);
    if (!request) {
      return true; // websocket upgrade
    }

    //Bypass guard for public routes OR login routes..
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    //Check can activate..
    const canActivate = await (super.canActivate(context) as Promise<boolean>);
    const jwt =
      ExtractJwt.fromAuthHeaderAsBearerToken()(request) ||
      ExtractJwt.fromUrlQueryParameter('auth')(request);
    const jwts = await this.authModel
      .find({
        userId: request.user.id,
        jwtType: request.user.jwtType,
        isValid: true,
      })
      .sort({ _id: -1 });

    if (
      request.user.jwtType == jwtTypeEnum.login &&
      !jwts.some((e) => e.jwt == jwt)
    )
      throw new UnauthorizedException();
    if (request.user.jwtType != jwtTypeEnum.login && jwts[0]?.jwt !== jwt)
      throw new UnauthorizedException();
    if (canActivate) {
      const { id, userType } = request.user;
      const account =
        userType == rolesTypeEnum.user
          ? await this.accountModel.findById(id).lean()
          : await this.adminModel.findById(id).lean();
      if (!account) throw new UnauthorizedException();
      return canActivate;
    }
  }

  getRequest(context: ExecutionContext) {
    return requestFromContext(context);
  }
}
