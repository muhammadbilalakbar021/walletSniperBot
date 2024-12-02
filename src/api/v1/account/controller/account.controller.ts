import { PasswordDto } from './../dto/Password.dto';
import { changePasswordDto } from './../dto/changePassword.dto';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { validate } from 'class-validator';
//import { ConsoleService } from '../../../../utils/console/console.service';
import { ConsoleService } from '../../../../utils/console/console.service';
//import { ResponseService } from '../../../../utils/response/response.service';
import { ResponseService } from '../../../../utils/response/response.service';
import { Response } from 'express';
import { accountDto } from '../dto/account.dto';
import { AccountService } from '../service/account.service';
import { Account } from '../interface/user';
import { AdminAccountDto } from '../dto/adminAccount.dto';
import { RealIP } from 'nestjs-real-ip';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Public } from '../../../../utils/decorators/public.decorator';
import { AdminRoleGuard } from '../../auth/guard/roles.guard';
import { userLimitDto } from '../dto/userLimit.dto';
import { ExtractJwt } from 'passport-jwt';

@Controller('account')
export class AccountController {
  constructor(
    protected accountService: AccountService,
    public readonly responseService: ResponseService,
    public readonly consoleService: ConsoleService,
  ) {}

  // Post Add Account
  @Public()
  @Post('sign-up')
  async addAccount(@Body() account: accountDto, @Res() res: Response) {
    try {
      const generatedId = await this.accountService.insertAccount(account);
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      console.log(error);
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while signing up.',
        res,
      );
    }
  }

  @Public()
  @Post('sign-in')
  async login(
    @RealIP() ip: string,
    @Body() account: accountDto,
    @Res() res: Response,
  ) {
    try {
      const generatedId = await this.accountService.login(account, false, ip);
      generatedId
        ? this.responseService.successResponse(true, generatedId, res)
        : this.responseService.badRequestResponse(true, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'You can not sign in right now.',
        res,
      );
    }
  }

  @Public()
  @Get('verify-jwt')
  async verifyJwt(@Res() res: Response, @Req() req: any) {
    try {
      const jwt = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      const generatedId = await this.accountService.verifyJwt(jwt);
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Some error occurred.',
        res,
      );
    }
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: any, @Res() res: Response) {
    try {
      const generatedId = await this.accountService.logout(
        ExtractJwt.fromAuthHeaderAsBearerToken()(req),
      );
      this.responseService.successResponse(
        true,
        'Logged out successfully.',
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while logging out.',
        res,
      );
    }
  }

  @Post('update')
  async update(
    @Req() req: any,
    @Body() account: accountDto,
    @Res() res: Response,
  ) {
    try {
      const generatedId = await this.accountService.updateAccount(
        req.user.id,
        account,
      );
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while updating account.',
        res,
      );
    }
  }

  @Get('get-user')
  async get(@Req() req: any, @Res() res: Response) {
    try {
      const generatedId = await this.accountService.getUser(req.user.id);
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Some error occurred while retrieving user.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Get('get-limits')
  async getLimits(@Req() req: any, @Res() res: Response) {
    try {
      const generatedId = await this.accountService.getLimits();
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while retrieving limits.',
        res,
      );
    }
  }

  @Post('delete-account')
  async deleteAccount(@Req() req: any, @Res() res: Response, @Body() body) {
    try {
      const generatedId = await this.accountService.deleteAccount(
        req.user.id,
        body.password,
      );
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while deleting account.',
        res,
      );
    }
  }

  @Get('verify-email')
  async verifyEmail(@Req() req: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.verifyEmail(req.user.id),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while verifying email.',
        res,
      );
    }
  }

  @Public()
  @Post('admin/sign-up')
  async addAdmin(@Body() account: AdminAccountDto, @Res() res: Response) {
    try {
      const generatedId = await this.accountService.addAdminAccount(account);
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Admin cannot signup now.',
        res,
      );
    }
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() account: { email: string },
    @Res() res: Response,
  ) {
    try {
      const generatedId = await this.accountService.forgotPassword(
        account.email,
      );
      this.responseService.successResponse(true, generatedId, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Some error occurred while requesting for a forgot password.',
        res,
      );
    }
  }

  @Public()
  @Post('admin/sign-in')
  async adminlogin(
    @RealIP() ip: string,
    @Body() account: AdminAccountDto,
    @Res() res: Response,
  ) {
    try {
      const generatedId = await this.accountService.login(account, true, ip);
      generatedId
        ? this.responseService.successResponse(true, generatedId, res)
        : this.responseService.badRequestResponse(true, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while signing in.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/change-password')
  async changePassword(@Body() pw: changePasswordDto, @Res() res: Response) {
    try {
      const result = await this.accountService.changeAdminPassword(pw);
      this.responseService.successResponse(true, result, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Some unknown error occurred while changing password kindly contact support.',
        res,
      );
    }
  }

  @Post('admin/set-user-limit')
  async setUserLimit(@Body() body: userLimitDto, @Res() res: Response) {
    try {
      const result = await this.accountService.setDailyLimit(body);
      this.responseService.successResponse(true, result, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot set user limit.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Patch('admin/enable-2fa')
  async enable2fa(@Req() req: Request & { user }, @Res() res: Response) {
    try {
      const result = await this.accountService.enable2fa(
        req.user.id,
        //  password,
      );
      this.responseService.successResponse(
        true,
        result
          ? 'Qr code is sent to your email address.'
          : 'Some error occurred while sending email.',
        res,
      );
    } catch (error) {
      this.responseService.serverFailureResponse(error, res);
    }
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/set-total-limit')
  async setTotalLimit(@Body() body: userLimitDto, @Res() res: Response) {
    try {
      const result = await this.accountService.setTotalLimit(body);
      this.responseService.successResponse(true, result, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot set total limit.',
        res,
      );
    }
  }

  @Post('request-kyc')
  async requestKyc(@Req() req: any, @Res() res: Response) {
    try {
      const jwt = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      const result = await this.accountService.requestKyc(req.user.id, jwt);
      this.responseService.successResponse(true, result, res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Some error occurred,please try later.',
        res,
      );
    }
  }

  @Public()
  @Get('admin/web-status')
  async webStatus(@Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.webMaintenanceStatus(),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot get web status.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/toggle-web-status')
  async toggleWebStatus(@Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.toggleWebMaintenanceStatus(),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot toggle web status.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/set-ip-account-limit')
  async setmiscAccounts(@Body() body: userLimitDto, @Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.setMicsIps(body),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot toggle web status.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Get('admin/get-ip-account-limit')
  async getmiscAccounts(@Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.getMicsIps(),
        res,
      );
      //CLG
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot toggle web status.',
        res,
      );
    }
  }

  @Public()
  @Post('register-guest')
  async registerGuest(
    @RealIP() ip: string,
    @Body() account: any,
    @Res() res: Response,
  ) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.registerGuest(ip, account.guestAddress),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(error.message, res);
    }
  }

  @UseGuards(AdminRoleGuard)
  @Get('admin/total-accounts')
  async getUsers(
    @Res() res: Response,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    try {
      return this.responseService.successResponse(
        true,
        await this.accountService.getAllAccounts(page, limit),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot get users, please try later.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/update-logo')
  async uploadLogo(@Body() body: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.updateLogo(body.logo),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Cannot update logo, please try later.',
        res,
      );
    }
  }

  @Public()
  @Get('get-logo')
  async getLogo(@Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.getLogo(),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while getting logo.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Get('admin/getKycs')
  async getKycs(
    @Res() res: Response,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.getKycs(page, limit),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'Error occurred while getting kycs.',
        res,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Get('admin/getKyc/:id')
  async getKyc(@Res() res: Response, @Param('id') kycHash) {
    try {
      this.responseService.successResponse(
        true,
        await this.accountService.getMoreAboutKyc(kycHash),
        res,
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == 'string'
          ? error.message
          : 'No data found for given kyc.',
        res,
      );
    }
  }
}
