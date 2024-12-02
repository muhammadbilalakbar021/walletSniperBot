import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type AdminAccountDocument = AdminAccountEntity &
  Document & {
    _id?: any;
  };

@Schema({ timestamps: true })
export class AdminAccountEntity {
  _id?: any;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false, unique: true })
  secondaryEmail: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false, required: false })
  maintenance: boolean;

  @Prop({ default: 0, required: false })
  userTotalLimit: number;

  @Prop({ default: 0, required: false })
  userDailyLimit: number;

  @Prop({ default: '', required: false })
  logo: string;

  @Prop({ default: '', required: false })
  privateKey: string;

  @Prop({ default: '', required: false })
  address: string;

  @Prop({ default: null, required: false })
  deletedAt: Date;

  @Prop({ default: true, required: false })
  isCreated: boolean;

  @Prop({ default: Date.now, required: false })
  createdAt: Date;

  @Prop({ default: false, required: false })
  isUpdated: boolean;

  @Prop({ default: null, required: false })
  updatedAt: Date;

  @Prop({ default: 5, required: false })
  ipAccountsLimit: number;

  @Prop({ default: false, required: false })
  is2faEnabled: true;

  @Prop({ default: false, required: false })
  TwofaSecret: string;
}

export const AdminAccountSchema =
  SchemaFactory.createForClass(AdminAccountEntity);
