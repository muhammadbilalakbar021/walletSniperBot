import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type RadiumWalletDocument = RadiumWalletEntity &
  Document & { _id?: any };

@Schema({ timestamps: true })
export class RadiumWalletEntity {
  _id?: any;

  @Prop({ required: true })
  contract_address: string;

  @Prop({ required: true, unique: true })
  tx_signer: string;

  @Prop({ required: true })
  block_number: number;

  @Prop({ required: false })
  wallet_balance: number;

  @Prop({ required: false, default: new Date() })
  createdAt: Date;
}

export const RadiumWalletSchema =
  SchemaFactory.createForClass(RadiumWalletEntity);
