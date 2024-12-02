import * as dotenv from 'dotenv';
import * as Joi from 'joi';
import { Injectable } from '@nestjs/common';
import { ConfigInterface } from './interface/config.interface';
import { ConsoleService } from '../utils/console/console.service';
const consoleService = new ConsoleService();

@Injectable()
export class ConfigService {
  private readonly envConfig: ConfigInterface;
  constructor() {
    dotenv.config({ path: `env/.env.${process.env.NODE_ENV}` });
    const config: { [name: string]: string } = process.env;
    const parsedConfig = JSON.parse(JSON.stringify(config));
    this.envConfig = this.validateInput(parsedConfig);
  }

  private validateInput = (envConfig): ConfigInterface => {
    const envVarSchema: Joi.ObjectSchema = Joi.object({
      NODE_ENV: Joi.string()
        .required()
        .valid(
          'development',
          'production',
          'staging',
          'provision',
          'inspection',
        )
        .default('development'),
      PORT: Joi.number().required(),
      MONGO_CLUSTER_URI: Joi.string().required(),
      JWT_TOKEN: Joi.string().required(),
      JWT_EXPIRY_TIME: Joi.string().required(),
      AWS_ACCESS_KEY: Joi.string().required(),
      AWS_SECRET_KEY: Joi.string().required(),
      AWS_BUCKET: Joi.string().required(),
      AWS_REGION: Joi.string().required(),
      WALLET_PRIVATE_KEY: Joi.string().required(),
      RPC_URL: Joi.string().required(),
      CIELO_API_KEY: Joi.string().required(),
      HELIUS_API_KEY: Joi.string().required(),

    });

    const { error, value: validatedEnvConfig } = envVarSchema.validate(
      envConfig,
      {
        abortEarly: false,
        allowUnknown: true,
      },
    );
    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }
    consoleService.print('Joi Schema Verified in config.service.ts');
    return validatedEnvConfig;
  };

  get nodeEnv(): string {
    return this.envConfig.NODE_ENV;
  }

  get port(): string {
    return this.envConfig.PORT;
  }

  get MONGO_CLUSTER_URI(): string {
    return this.envConfig.MONGO_CLUSTER_URI;
  }

  get JWT_TOKEN(): string {
    return this.envConfig.JWT_TOKEN;
  }

  get JWT_EXPIRY_TIME(): string {
    return this.envConfig.JWT_EXPIRY_TIME;
  }

  get AWS_ACCESS_KEY(): string {
    return this.envConfig.AWS_ACCESS_KEY;
  }

  get AWS_SECRET_KEY(): string {
    return this.envConfig.AWS_SECRET_KEY;
  }

  get AWS_BUCKET(): string {
    return this.envConfig.AWS_BUCKET;
  }

  get AWS_REGION(): string {
    return this.envConfig.AWS_REGION;
  }

  get CEX_SECRET_KEY(): string {
    return this.envConfig.CEX_SECRET_KEY;
  }

  get USDT_CONTRACT_ADDRESS(): string {
    return this.envConfig.USDT_CONTRACT_ADDRESS;
  }

  get WALLET_PRIVATE_KEY(): string {
    return this.envConfig.WALLET_PRIVATE_KEY;
  }

  get RPC_URL(): string {
    return this.envConfig.RPC_URL;
  }

  get MORALIS_PUB_KEY(): string {
    return this.envConfig.MORALIS_PUB_KEY;
  }


  get HELIUS_API_KEY(): string {
    return this.envConfig.HELIUS_API_KEY;
  }

  get CIELO_API_KEY(): string {
    return this.envConfig.CIELO_API_KEY;
  }

}
