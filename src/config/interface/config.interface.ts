import * as Joi from "joi";
export interface ConfigInterface {
  USDT_CONTRACT_ADDRESS: string;
  NODE_ENV: string;
  PORT: string;
  MONGO_LOCAL_URI: string;
  MONGO_CLUSTER_URI: string;
  JWT_TOKEN: string;
  JWT_EXPIRY_TIME: string;
  TWILLIO_AUTH_TOKEN: string;
  TWILLIO_ACCOUNT_SID: string;
  AWS_ACCESS_KEY: string;
  AWS_SECRET_KEY: string;
  AWS_BUCKET: string;
  AWS_REGION: string;
  CEX_SECRET_KEY: string;

  WALLET_PRIVATE_KEY: string;
  RPC_URL: string;
  MORALIS_PUB_KEY: string;

  CIELO_API_KEY: string;
  HELIUS_API_KEY: string;
}
