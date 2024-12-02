import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "../../../../config/config.service";
import { TokenService } from "../token.service";

@Injectable()
export class WalletBalanceCron {
  private readonly logger = new Logger(WalletBalanceCron.name);
  private is_cron_running = false;
  private readonly batchSize = 100; // Size of each batch

  constructor(private readonly configService: ConfigService, private readonly tokenService: TokenService) {}

  // @Cron(CronExpression.EVERY_HOUR)
  async checkTokensForNewLiquidity() {
    if (this.is_cron_running) {
      console.log("Wallet Balance Cron job is already running. Skipping this run.");
      return;
    }
    this.is_cron_running = true; // Set the flag to indicate the cron job is running
    try {
      // Fetching the tokens that are expected to gain in the future
      const wallets = await this.tokenService.getAllWallets();

      // Process each token one by one
      for (let i = 0; i < wallets.length; i += this.batchSize) {
        const batch = wallets.slice(i, i + this.batchSize);
        const batchResults = await Promise.all(
          batch.map(async (wallet) => {
            try {
              const { solBalance } = await this.tokenService.getWalletBalance(wallet.tx_signer);
              console.log("Wallet Address", wallet.tx_signer, "Balance:", solBalance);
              if (Number(solBalance) > 10) {
                await this.tokenService.updateRadiumWallet(wallet.tx_signer, solBalance);
                await this.tokenService.createOrUpdateWallet({
                  wallet_address: wallet.tx_signer,
                  wallet_balance : Number(solBalance)
                });
                return wallet.tx_signer; // Return valid wallet
              }
            } catch (error) {
              console.error(`Error fetching balance for wallet ${wallet.tx_signer}:`, error.message);
            }
            return null; // Return null for wallets with errors or not meeting the criteria
          })
        );
      }
    } catch (error) {
      console.error("Error while checking tokens for new liquidity:", error);
      throw new Error("Error while converting Tokens: " + error.message);
    } finally {
      this.is_cron_running = false; // Reset the flag when the job is complete
    }
  }

  onModuleInit() {
    this.logger.verbose("Initializing Shit Coin Service...");
  }

  onModuleDestroy() {
    this.logger.verbose("Destroying Gainer Service...");
    // Perform any necessary cleanup here
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
