import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifySignature } from 'verify-xrpl-signature';
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  verifyJwt(jwt) {
    return this.jwtService.verify(jwt);
  }
}
