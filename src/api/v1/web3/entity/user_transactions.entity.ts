import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type UserTransactionDocument = UserTransactionEntity &
  Document & { _id?: any };

@Schema({ timestamps: true })
export class UserTransactionEntity {
  _id?: any;

  @Prop({ unique: true, required: true })
  wallet_address: string;

  @Prop({ required: true })
  contract_address: string;

  @Prop({ required: true })
  amount_sol: string;

  @Prop({ required: true })
  amount_token: string;

  @Prop({ required: true })
  tx_hash: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  block_number: number;

  @Prop({ required: false, default: new Date() })
  createdAt: Date;
}

export const UserTransactionSchema = SchemaFactory.createForClass(
  UserTransactionEntity
);
