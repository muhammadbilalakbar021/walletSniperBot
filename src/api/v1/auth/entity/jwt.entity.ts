import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type JwtDocument = JwtEntity &
  Document & {
    _id?: any;
  };

@Schema({ timestamps: true })
export class JwtEntity {
  _id?: any;

  @Prop({ default: '', required: true })
  userId: string;

  @Prop({ required: true, default: '' })
  jwt: string;
  @Prop({ required: true, default: '' })
  jwtType: string;
  @Prop({ required: false, default: true })
  isValid: boolean;

  @Prop({ required: false, default: new Date(), expires: '1440m' })
  createdAt: Date;
}

export const JwtSchema = SchemaFactory.createForClass(JwtEntity);
