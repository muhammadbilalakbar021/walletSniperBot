import { jwtTypeEnum, rolesTypeEnum } from '../../../../utils/misc/enums';

export interface JwtPayload {
  id: string;
  userType: rolesTypeEnum;
  jwtType: jwtTypeEnum;
}
