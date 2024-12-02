import { Web3Service } from "../web3.service";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Connection, PublicKey } from "@solana/web3.js";
import { RadiumService } from "../radium.service";
import * as path from "path";
import * as fs from "fs";
import { ConfigService } from "../../../../config/config.service";
import { TokenService } from "../token.service";

@Injectable()
export class WalletFilterationCron {
  private readonly logger = new Logger(WalletFilterationCron.name);
  private is_cron_running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly web3Service: Web3Service
  ) {}

  // @Cron(CronExpression.EVERY_MINUTE)
  async checkTokensForNewLiquidity() {
    if (this.is_cron_running) {
      console.log("Token Filteration Cron job is already running. Skipping this run.");
      return;
    }

    this.is_cron_running = true; // Set the flag to indicate the cron job is running

    try {
      // Fetching the tokens that are expected to gain in the future
      const token = await this.tokenService.getUnfilteredToken();
      if (token?.tokenMintAddress) {
        console.log("Going to filter wallets for token ", token?.tokenMintAddress);
        await this.tokenService.filterRadiumWallets(token?.tokenMintAddress);
        console.log("Going to update the token details");
        await this.tokenService.updateUnfilteredTokenBool(token.id);
      }
    } catch (error) {
      console.error("Error while scrappping tokens for transactions:", error);
      throw new Error("Error while scrappping tokens: " + error.message);
    } finally {
      this.is_cron_running = false; // Reset the flag when the job is complete
    }
  }

  onModuleInit() {
    this.logger.verbose("Initializing Token Filteration Service...");
  }

  onModuleDestroy() {
    this.logger.verbose("Destroying Token Filteration Service...");
    // Perform any necessary cleanup here
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
