/* eslint-disable @typescript-eslint/no-var-requires */
import { S3 } from 'aws-sdk';
import { Web3Service } from './../../web3/web3.service';
import {
  jwtTypeEnum,
  rolesTypeEnum,
  KycStatus,
} from './../../../../utils/misc/enums';
import { JwtPayload } from './../../auth/interface/jwt-payload.interface';
import * as fs from 'fs';
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { accountDto } from '../dto/account.dto';
import { changePasswordDto } from '../dto/changePassword.dto';
import { AccountEntity, AccountDocument } from '../entity/account.entity';
import { Account } from '../interface/user';
import * as bcrypt from 'bcrypt';
import {
  AdminAccountDocument,
  AdminAccountEntity,
} from '../entity/adminAccount.entity';
import { SendMail } from '../../../../utils/sendgrid/sendMail.utils';
import { JwtDocument, JwtEntity } from '../../auth/entity/jwt.entity';
import { userLimitDto } from '../dto/userLimit.dto';
import { ConfigService } from '../../../../config/config.service';
import * as crypto from 'crypto';
import { S3Service } from '../../S3/service/s3.service';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { Readable } from 'stream';
import { TwofaService } from '../../2fa/2fa.service';
const axios = require('axios');
const request = require('request');
const s3Service = new S3Service(new ConfigService());
@Injectable()
export class AccountService {
  constructor(
    @InjectModel(AccountEntity.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(AdminAccountEntity.name)
    private readonly adminModel: Model<AdminAccountDocument>,
    @InjectModel(JwtEntity.name)
    private readonly authModel: Model<JwtDocument>,
    @InjectConnection() private readonly connection: Connection,
    private jwtService: JwtService,
    private web3Service: Web3Service,
    private sendGrid: SendMail,
    private readonly twofaService: TwofaService,
    private readonly conifg: ConfigService,
  ) {}

  async signJwt(id, userType, jwtType) {
    const payload: JwtPayload = {
      id,
      userType,
      jwtType,
    };
    const jwt = await this.jwtService.sign(payload, {
      secret: this.conifg.JWT_TOKEN,
    });
    const jwts = await this.authModel
      .find({ userId: id.valueOf(), jwtType: jwtTypeEnum.forgetPassword })
      .sort({ _id: -1 });
    const checks = [false, false];
    //check only with last element if it was asked for more than 1 minute
    if (jwts.length > 0) {
      const now = +new Date() / 1000;
      const lastsTime = +jwts[0]?.createdAt / 1000;
      if (now - lastsTime < 60) checks[0] = true;
      if (jwts.length == 5) checks[1] = true;
    }
    if (jwtType == jwtTypeEnum.login) {
      const j2 = await this.authModel.find({
        userId: id.valueOf(),
        jwtType: jwtTypeEnum.login,
      });

      // if (j2.length == 5) throw 'Login Device limit exceeded.';
    }
    if (jwtType != jwtTypeEnum.login && checks.some((e) => e == true))
      throw checks[1]
        ? 'You are not allowed to request before 24h.'
        : 'You have to wait for 1 minute before requesting server.';
    await this.authModel.create({
      userId: id.valueOf(),
      jwt,
      jwtType,
      createdAt: new Date(),
    });
    return jwt;
  }

  async insertAccount(account: any): Promise<any> {
    let id;
    try {
      const ex = await this.accountModel.findOne({
        address: account.address,
        signature: account.signature,
        isDeleted: false,
        isEmailVerified: false,
      });
      if (ex) {
        return {
          jwt: await this.signJwt(
            ex.id,
            rolesTypeEnum.user,
            jwtTypeEnum.signup,
          ),
        };
      }

      const newUser = await this.accountModel.create({
        address: account.address,
        signature: account.signature,
        isDeleted: false,
        isEmailVerified: true,
      });
      const jwt = await this.signJwt(
        newUser.id,
        rolesTypeEnum.user,
        jwtTypeEnum.signup,
      );
      id = newUser.id;
      // const email = await this.sendGrid.sendEmailJwt(account.email, jwt, 0);
      if (id) {
        return { jwt };
      } else {
        await this.accountModel.findByIdAndDelete(id);
        throw 'Some error occurred, try later.';
      }
    } catch (message) {
      await this.accountModel.findByIdAndDelete(id);
      throw { message };
    }
  }

  async logout(jwt) {
    try {
      return await this.authModel.findOneAndDelete({ jwt });
    } catch (message) {
      throw { message };
    }
  }

  async enable2fa(_id) {
    try {
      const { secret, otpauthUrl } =
        await this.twofaService.generateTwoFactorAuthenticationSecret(_id);
      const admin = await this.adminModel.findOneAndUpdate(
        {},
        {
          is2faEnabled: true,
          TwofaSecret: secret,
        },
      );
      return await this.twofaService.pipeQrCodeStream(
        admin.secondaryEmail,
        secret,
        otpauthUrl,
      );
    } catch (error) {
      throw {
        message:
          error.message ||
          error.error ||
          error.err ||
          (typeof error == 'string' ? error : 'Request Failed.'),
      };
    }
  }

  async updateAccount(id: any, data: accountDto): Promise<any> {
    try {
      await this.accountModel.findByIdAndUpdate(id, data);
      const user = await this.accountModel.findById(id).lean();
      const { address } = user;
      return { address };
    } catch (message) {
      throw { message };
    }
  }

  async getUser(id: any): Promise<any> {
    try {
      const { address, kycStatus } = await this.accountModel.findById(id);
      return {
        address,
        kycStatus: kycStatus,
      };
    } catch (message) {
      throw { message };
    }
  }

  async forgotPassword(email: any): Promise<any> {
    try {
      const user = await this.accountModel.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });
      const jwt = await this.signJwt(
        user.id,
        rolesTypeEnum.user,
        jwtTypeEnum.forgetPassword,
      );
      const emailSent = await this.sendGrid.sendEmailJwt(email, jwt, 1);
      if (emailSent) return 'An email is sent successfully.';
      else throw 'Some error occurred.';
    } catch (message) {
      throw { message };
    }
  }

  async verifyEmail(id) {
    try {
      const user = await this.accountModel.findById(id);
      if (user) {
        if (user.isEmailVerified) throw 'Email is already verified.';
        user.isEmailVerified = true;
        await user.save();
        const jwt = await this.signJwt(
          user.id,
          rolesTypeEnum.user,
          jwtTypeEnum.login,
        );
        return jwt;
      }
      throw 'Email is not registered.';
    } catch (message) {
      throw { message };
    }
  }

  async addAdminAccount(account: any): Promise<any> {
    try {
      account.password = await bcrypt.hash(account.password, 10);
      const admin = await this.adminModel.findOne();
      if (admin)
        throw new ForbiddenException('There can not be two super admins.');
      const newUser = new this.adminModel(account);
      await newUser.save();
      const jwt = await this.signJwt(
        newUser.id,
        rolesTypeEnum.admin,
        jwtTypeEnum.login,
      );
      return jwt;
    } catch (message) {
      throw { message };
    }
  }

  async webMaintenanceStatus() {
    try {
      const { maintenance, is2faEnabled } = await this.adminModel.findOne();
      return { maintenance, is2faEnabled };
    } catch (message) {
      throw { message };
    }
  }

  async verifyJwt(jwt) {
    try {
      if ((await this.authModel.findOne({ jwt })) != undefined) return true;
      else return false;
    } catch (message) {
      throw { message };
    }
  }

  async toggleWebMaintenanceStatus() {
    try {
      const admin = await this.adminModel.findOne();
      admin.maintenance = !admin.maintenance;
      await admin.save();
      return admin.maintenance;
    } catch (message) {
      throw { message };
    }
  }

  async setMicsIps(body) {
    try {
      const admin = await this.adminModel.findOne();
      admin.ipAccountsLimit = body.limit;
      await admin.save();
      return admin.ipAccountsLimit;
    } catch (message) {
      throw { message };
    }
  }

  async getMicsIps() {
    try {
      const admin = await this.adminModel.findOne();
      return admin.ipAccountsLimit || 0;
    } catch (message) {
      throw { message };
    }
  }

  async setDailyLimit(body) {
    try {
      const admin = await this.adminModel.findOne();
      if (admin.userTotalLimit == 0)
        throw "You must add User's total transaction limit before setting daily limit.";
      if (admin.userTotalLimit <= body.limit)
        throw "User's Daily limit should not be equal or greater than total limit.";
      admin.userDailyLimit = body.limit;
      await admin.save();
      return admin.userDailyLimit;
    } catch (message) {
      throw { message };
    }
  }

  async setTotalLimit(body) {
    try {
      const admin = await this.adminModel.findOne();
      if (admin.userDailyLimit && admin.userDailyLimit >= body.limit)
        throw "User's Total limit should not be less than daily limit.";
      admin.userTotalLimit = body.limit;
      await admin.save();
      return admin.userTotalLimit;
    } catch (message) {
      throw { message };
    }
  }

  async updateLogo(logo: string) {
    try {
      const admin = await this.adminModel.findOne();
      admin.logo = logo;
      await admin.save();
      return admin.logo;
    } catch (message) {
      throw { message };
    }
  }

  async getLogo() {
    try {
      const admin = await this.adminModel.findOne().lean();
      return admin.logo;
    } catch (message) {
      throw { message };
    }
  }

  async getAllAccounts(page = 0, limit = 10): Promise<any> {
    try {
      page++;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const result: any = {};
      const filter = { isDeleted: false };
      const count = await this.accountModel
        .find(filter)
        .countDocuments()
        .exec();
      if (endIndex < count) {
        result.next = {
          page: page + 1,
          limit: limit,
        };
      }
      if (startIndex > 0) {
        result.previous = {
          page: page - 1,
          limit: limit,
        };
      }
      return {
        totalCount: count,
        currentPage: --page,
        currentLimit: limit,
        data: await this.accountModel
          .find(filter)
          .sort({ _id: -1 })
          .select('name email country isEmailVerified createdAt')
          .limit(limit)
          .skip(startIndex)
          .lean(),
      };
    } catch (message) {
      throw { message };
    }
  }

  async registerGuest(ip: any, guestAddress): Promise<any> {
    try {
      return await this.authModel.findOneAndUpdate(
        { guestAddress },
        { ip, userType: 'guest', guestAddress },
        { upsert: true, new: true },
      );
    } catch (message) {
      throw { message };
    }
  }

  async getLimits() {
    try {
      const { userTotalLimit, userDailyLimit } = await this.adminModel
        .findOne()
        .lean();
      return { userTotalLimit, userDailyLimit };
    } catch (message) {
      throw { message };
    }
  }

  async login(body: any, admin: boolean, ip) {
    try {
      const account: any = admin
        ? await this.adminModel
            .findOne({
              email: body.email,
              isDeleted: false,
            })
            .lean()
        : await this.accountModel
            .findOne({
              address: body.address,
              isBlacklisted: false,
              isEmailVerified: true,
              isDeleted: false,
            })
            .lean();
      // if (account && (await bcrypt.compare(body.password, account.password))) {
      if (account) {
        const jwt = await this.signJwt(
          account._id,
          admin ? rolesTypeEnum.admin : rolesTypeEnum.user,
          jwtTypeEnum.login,
        );
        return jwt;
      }
      throw account ? 'User password is not correct.' : 'User not found.';
    } catch (message) {
      throw { message };
    }
  }

  async deleteAccount(userId: string, passwd) {
    try {
      const user = await this.accountModel.findById(userId);
      if (user) {
        user.isDeleted = true;
        await user.save();
        await this.authModel.findOneAndDelete({ userId });
        return 'Account Deleted successfully.';
      }
      throw new UnauthorizedException('Password is incorrect.');
    } catch (message) {
      throw { message };
    }
  }

  async changeAdminPassword(pw: changePasswordDto) {
    try {
      const { oldPassword, newPassword, confirmPassword } = pw;
      const account = await this.adminModel.findOne();
      const newEquals = newPassword == confirmPassword;
      const oldEquals = await bcrypt.compare(oldPassword, account.password);
      const oldNewSame = newPassword == oldPassword;
      if (account && newEquals && oldEquals && !oldNewSame) {
        account.password = await bcrypt.hash(newPassword, 10);
        await account.save();
        return 'Password changed successfully.';
      }

      throw !newEquals
        ? 'New and confirm passwords are not same.'
        : !oldEquals
        ? 'Old password is incorrect.'
        : oldNewSame
        ? 'Old and new password should not be same.'
        : 'Some error occurred.';
    } catch (message) {
      throw { message };
    }
  }

  async requestKyc(id, jwt) {
    try {
      // await this.authModel.findOneAndDelete({ jwt });
      const user = await this.accountModel.findById(id);
      if (user.kycStatus == 'approved') throw "User's kyc is already approved.";
      if (user.kycStatus == 'submitted')
        throw "User's kyc is under review please wait.";

      const url = 'https://stationapi.veriff.com/v1/sessions';
      const headers = {
        headers: {
          'X-AUTH-CLIENT': 'this.conifg.VERIFF_API_KEY',
        },
      };
      const Body = {
        verification: {
          callback:
            'https://1764-2a02-c7c-3322-c700-1d1f-f276-29aa-4416.ngrok-free.app/api/v1',
          person: {
            idNumber: user.address,
          },
          vendorData: id,
        },
      };

      const httpRequest = await axios.post(url, Body, headers);
      user.kycStatus = httpRequest.data.verification.status;
      user.kycSessionToken = httpRequest.data.verification.sessionToken;
      user.kycHash = httpRequest.data.verification.id;
      user.kycUrl = httpRequest.data.verification.url;
      await user.save();
      return { url: httpRequest.data.verification.url };
    } catch (error) {
      console.log(error);
      return { message: 'Error occured while requesting kyc link.' };
    }
  }

  async getKycs(page = 0, limit = 10) {
    try {
      page++;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const result: any = {};
      const filter = { isDeleted: false };
      const count = await this.accountModel
        .find({ kycHash: { $ne: null } })
        .countDocuments()
        .exec();
      if (endIndex < count) {
        result.next = {
          page: page + 1,
          limit: limit,
        };
      }
      if (startIndex > 0) {
        result.previous = {
          page: page - 1,
          limit: limit,
        };
      }
      return {
        totalCount: count,
        currentPage: --page,
        currentLimit: limit,
        data: (
          await this.accountModel
            .find({ kycHash: { $ne: null } })
            .sort({ _id: -1 })
            .limit(limit)
            .skip(startIndex)
            .lean()
        )?.map((id) => {
          const { type, country } =
            id.documents != ''
              ? JSON.parse(id.documents)
              : {
                  type: 'Document not available yet',
                  country: 'Country is not available yet',
                };
          const { kycTime, kycStatus, kycHash } = id;
          return { kycTime, kycStatus, kycHash, type, country };
        }),
      };
    } catch (message) {
      throw { message: 'No data found' };
    }
  }

  async getMoreAboutKyc(kycHash) {
    try {
      const user = await this.accountModel.findOne({ kycHash });
      if (user.documents != '') return JSON.parse(user.documents);

      const signature = crypto
        .createHmac('sha256', 'this.conifg.VERIFF_PRIVATE_KEY')
        .update(Buffer.from(kycHash, 'utf8'))
        .digest('hex')
        .toLowerCase();
      let url =
        'https://stationapi.veriff.com/v1/sessions/' + kycHash + '/media';
      let headers = {
        headers: {
          'X-AUTH-CLIENT': 'this.conifg.VERIFF_API_KEY',
          'X-HMAC-SIGNATURE': signature,
          'Content-Type': 'application/json',
        },
      };
      let httpRequest = await axios.get(url, headers);
      const images = [];
      await httpRequest.data?.images.reduce(async (promise, elem) => {
        await promise;
        const url = 'https://stationapi.veriff.com/v1/media/' + elem.id;
        const signature = crypto
          .createHmac('sha256', 'this.conifg.VERIFF_PRIVATE_KEY')
          .update(Buffer.from(elem.id, 'utf8'))
          .digest('hex')
          .toLowerCase();
        const headers = {
          headers: {
            'X-AUTH-CLIENT': 'this.conifg.VERIFF_API_KEY',
            'X-HMAC-SIGNATURE': signature,
            'Content-Type': 'application/json',
          },
        };
        const options = {
          method: 'GET',
          url,
          headers: headers.headers,
        };
        const upload = require('s3-write-stream')({
          accessKeyId: this.conifg.AWS_ACCESS_KEY,
          secretAccessKey: this.conifg.AWS_SECRET_KEY,
          Bucket: this.conifg.AWS_BUCKET,
        });
        const filename = elem.id + '.jpeg';
        request(options, async function (error, response, body) {
          if (error) throw new Error(error);
        }).pipe(upload(filename));
        images.push(
          'https://s3.amazonaws.com/blackrock-application/' + filename,
        );
      }, Promise.resolve());
      const videos = [];
      await httpRequest.data?.videos.reduce(async (promise, elem) => {
        await promise;
        const url = 'https://stationapi.veriff.com/v1/media/' + elem.id;
        const signature = crypto
          .createHmac('sha256', 'this.conifg.VERIFF_PRIVATE_KEY')
          .update(Buffer.from(elem.id, 'utf8'))
          .digest('hex')
          .toLowerCase();
        const headers = {
          headers: {
            'X-AUTH-CLIENT': 'this.conifg.VERIFF_API_KEY',
            'X-HMAC-SIGNATURE': signature,
            'Content-Type': 'application/json',
          },
        };
        const options = {
          method: 'GET',
          url,
          headers: headers.headers,
        };
        const upload = require('s3-write-stream')({
          accessKeyId: this.conifg.AWS_ACCESS_KEY,
          secretAccessKey: this.conifg.AWS_SECRET_KEY,
          Bucket: this.conifg.AWS_BUCKET,
        });
        const filename = elem.id + '.webm';
        request(options, async function (error, response, body) {
          if (error) throw new Error(error);
        }).pipe(upload(filename));
        videos.push(
          'https://s3.amazonaws.com/blackrock-application/' + filename,
        );
      }, Promise.resolve());

      url =
        'https://stationapi.veriff.com/v1/sessions/' + kycHash + '/decision';
      headers = {
        headers: {
          'X-AUTH-CLIENT': 'this.conifg.VERIFF_API_KEY',
          'X-HMAC-SIGNATURE': signature,
          'Content-Type': 'application/json',
        },
      };
      httpRequest = await axios.get(url, headers);
      const { type, country } = httpRequest?.data?.verification?.document || {
        type: 'Not available yet',
        country: 'Not available yet',
      };
      user.documents = JSON.stringify({ type, country, videos, images });
      await user.save();
      return { type, country, videos, images };
    } catch (message) {
      throw { message: 'Data is not submitted yet.' };
    }
  }
}
