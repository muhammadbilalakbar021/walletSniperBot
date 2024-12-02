import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type TokenDocument = TokenEntity & Document & { _id?: any };

@Schema({ timestamps: true })
export class TokenEntity {
  _id?: any;

  @Prop({ required: true })
  tokenName: string;

  @Prop({ required: true })
  tokenSymbol: string;

  @Prop({ required: true })
  tokenDecimals: number;

  @Prop({ required: true })
  tokenMintAddress: string;

  @Prop({ required: true })
  solanaAddress: string;

  @Prop({ required: true })
  lpPairAddress: string;

  @Prop({ required: true })
  buyPrice: number;

  @Prop({ required: true })
  minGet: number;

  @Prop({ required: true })
  maxGet: number;

  @Prop({ required: false })
  liquidityFound?: number;

  @Prop({ required: false })
  liquidityAvailable?: number;

  @Prop({ required: false })
  maxLiquidity?: number;

  @Prop({ required: false })
  minLiquidity?: number;

  @Prop({ required: false })
  reason: string;

  @Prop({ required: true })
  recievedAt: string;

  @Prop({ required: false, default: true })
  isValid: boolean;

  @Prop({ required: false, default: false })
  isGainer: boolean;

  @Prop({ required: false, default: false })
  isComfirmedGainer: boolean;

  @Prop({ required: false, default: false })
  isTokenMoved: boolean;

  @Prop({ required: false, default: false })
  wasFutureGainer: boolean;

  @Prop({ required: false, default: new Date() })
  tokenMovedAt: Date;

  @Prop({ required: false, default: new Date() })
  createdAt: Date;

  @Prop({ required: false })
  liquidityWentToZeroAt: string;

  // New properties for transactions
  @Prop({ required: false })
  txns_m5_buys?: number;

  @Prop({ required: false })
  txns_m5_sells?: number;

  @Prop({ required: false })
  txns_h1_buys?: number;

  @Prop({ required: false })
  txns_h1_sells?: number;

  @Prop({ required: false })
  txns_h6_buys?: number;

  @Prop({ required: false })
  txns_h6_sells?: number;

  @Prop({ required: false })
  txns_h24_buys?: number;

  @Prop({ required: false })
  txns_h24_sells?: number;

  @Prop({ required: false })
  priceNative?: string;

  @Prop({ required: false })
  priceUsd?: string;

  @Prop({ required: false })
  volume_h24?: number;

  @Prop({ required: false })
  volume_h6?: number;

  @Prop({ required: false })
  volume_h1?: number;

  @Prop({ required: false })
  volume_m5?: number;

  @Prop({ required: false })
  priceChange_m5?: number;

  @Prop({ required: false })
  priceChange_h1?: number;

  @Prop({ required: false })
  priceChange_h6?: number;

  @Prop({ required: false })
  priceChange_h24?: number;

  @Prop({ required: false })
  liquidity_usd?: number;

  @Prop({ required: false })
  liquidity_base?: number;

  @Prop({ required: false })
  liquidity_quote?: number;

  @Prop({ required: false })
  fdv?: number;

  @Prop({ required: false })
  pairCreatedAt?: number;

  @Prop({ required: false , default: false})
  are_transactions_scraped?: boolean;

  @Prop({ required: false , default: false})
  are_transactions_filtered?: boolean;

  @Prop({ required: false , default: false})
  is_token_shit?: boolean;
}

export const TokenSchema = SchemaFactory.createForClass(TokenEntity);
