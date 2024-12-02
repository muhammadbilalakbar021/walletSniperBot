import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type WalletDocument = WalletEntity & Document & { _id?: any };

@Schema({ timestamps: true })
export class WalletEntity extends Document {
  _id?: any;

  @Prop({ unique: true, required: true })
  wallet_address: string;

  @Prop({ required: false, default: 0 })
  wallet_balance: number;

  @Prop({ required: false })
  total_transactions_count: number;

  @Prop({ required: false })
  radium_transactions_count: number;

  @Prop({ required: false, type: Number, default: 0 })
  realized_pnl_usd: number;

  @Prop({ required: false, type: Number, default: 0 })
  realized_roi_percentage: number;

  @Prop({ required: false, type: Number, default: 0 })
  tokens_traded: number;

  @Prop({ required: false, type: Number, default: 0 })
  unrealized_pnl_usd: number;

  @Prop({ required: false, type: Number, default: 0 })
  unrealized_roi_percentage: number;

  @Prop({ required: false, type: Number, default: 0 })
  winrate: number;

  @Prop({ required: false, type: Number, default: 0 })
  average_holding_time: number;

  @Prop({ required: false, type: Number, default: 0 })
  combined_pnl_usd: number;

  @Prop({ required: false, type: Number, default: 0 })
  combined_roi_percentage: number;

  @Prop({ required: false, default: false })
  is_error: boolean;

  @Prop({ required: false, default: "" })
  error_message: string;

  @Prop({ required: false, default: false })
  is_processed: boolean;

  @Prop({ required: false, default: new Date() })
  createdAt: Date;

  @Prop({ required: false, default: new Date() })
  updatedAt: Date;
}

export const WalletSchema = SchemaFactory.createForClass(WalletEntity);
