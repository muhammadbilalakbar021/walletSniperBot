/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Body, Post, Res, Req } from '@nestjs/common';
import { ResponseService } from '../../../../utils/response/response.service';
import { AuthService } from '../service/auth.service';
import { Response } from 'express';
import { accountDto } from '../../account/dto/account.dto';

@Controller('Auth')
export class AuthController {}
