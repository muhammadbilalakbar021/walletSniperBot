import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type AccountDocument = AccountEntity &
  Document & {
    _id?: any;
  };

@Schema({ timestamps: true })
export class AccountEntity {
  _id?: any;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  signature: string;

  @Prop({ default: '', required: false })
  documents: string;

  @Prop({ default: 0, required: true })
  isBlacklisted: boolean;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: false, required: true })
  isDeleted: boolean;

  @Prop({ default: false, required: true })
  isEmailVerified: boolean;

  @Prop({ default: null, required: false })
  deletedAt: Date;

  @Prop({ default: true, required: false })
  isCreated: boolean;

  @Prop({ default: Date.now, required: false })
  createdAt: Date;

  @Prop({ default: null, required: false })
  kycStatus: string;

  @Prop({ default: null, required: false })
  kycSessionToken: string;

  @Prop({ default: null, required: false })
  kycReason: string;

  @Prop({ default: null, required: false })
  kycHash: string;

  @Prop({ default: null, required: false })
  kycUrl: string;

  @Prop({ default: new Date(), required: false })
  kycTime: Date;

  @Prop({ default: false, required: false })
  isUpdated: boolean;

  @Prop({ default: null, required: false })
  updatedAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(AccountEntity);
