import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type TokenTransactionDocument = TokenTransactionEntity & Document & { _id?: any };

@Schema({ timestamps: true })
export class TokenTransactionEntity {
  _id?: any;

  @Prop({ required: true })
  contract_address: string;

  @Prop({ required: true })
  tx_hash: string;

  @Prop({ required: true })
  tx_signer: string;

  @Prop({ required: true })
  block_number: number;

  @Prop({ required: false, default: new Date() })
  createdAt: Date;

}

export const TokenTransactionSchema = SchemaFactory.createForClass(TokenTransactionEntity);
