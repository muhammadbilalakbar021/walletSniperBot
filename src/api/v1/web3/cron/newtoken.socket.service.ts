import { Web3Service } from "../web3.service";
import { Injectable, Logger } from "@nestjs/common";
import { Connection, PublicKey } from "@solana/web3.js";
import { RadiumService } from "../radium.service";
import * as fs from "fs";
import { ConfigService } from "../../../../config/config.service";
import { TokenService } from "../token.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class RadiumTokenSocketService {
  private readonly logger = new Logger(RadiumTokenSocketService.name);
  private readonly logFilePath = "./logs/shit_token_liquidity_logs.txt"; // Specify the log file path
  private readonly logLiquidityFilePath = "./logs/shit_token_logs.txt"; // Specify the log file path
  private readonly tokensFilePath = "./logs/shit_tokens.json"; // Specify the log file path
  private readonly solTradeAmount = 3;

  private connection: Connection;
  private readonly RAYDIUM_PUBLIC_KEY = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
  private readonly raydium = new PublicKey(this.RAYDIUM_PUBLIC_KEY);
  private processedSignatures: Set<string> = new Set();
  seenSignatures: Set<string> = new Set();
  tokenArray: any = [];
  isOneSaved: number = 0;

  constructor(
    private readonly web3Service: Web3Service,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly radiumService: RadiumService
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkTokensForNewLiquidity() {
    try {
      this.tokenArray = await this.tokenService.getUndraftedTokens();

      if (this.tokenArray.length > 0) {
        const fetchPriceWithRetries = async (token) => {
          let attempts = 0;

          while (attempts < 3) {
            try {
              console.log(`Attempting to fetch price for token: ${token.tokenMintAddress} (Attempt ${attempts + 1})`);

              const price = await this.radiumService.getTheTokenPrice(
                token.tokenMintAddress,
                token.solanaAddress,
                token.lpPairAddress,
                token.buyPrice
              );

              console.log(`Successfully fetched price for token: ${token.tokenMintAddress}`);
              return price; // Return price if successful
            } catch (error) {
              attempts++;
              console.warn(`Failed attempt ${attempts} for token: ${token.tokenMintAddress}. Error: ${error.message}`);

              if (attempts >= 3) {
                console.error(`Failed to fetch price for token: ${token.tokenMintAddress} after 3 attempts.`);
                await this.tokenService.updateToken(
                  token.tokenMintAddress,
                  0, // Assuming liquidityAvailable is 0 on failure
                  `Failed to fetch price for token ${token.tokenMintAddress} after 3 attempts: ${error.message}`,
                  false
                );
                return null; // Return null if all attempts fail
              }
            }
          }
        };

        const prices = await Promise.all(this.tokenArray.map((token) => fetchPriceWithRetries(token)));

        prices.forEach((price, index) => {
          if (price !== null) {
            console.log(`Comparing prices for token: ${this.tokenArray[index].tokenMintAddress}`);
            this.comparePrices(price, this.tokenArray[index], index);
          }
        });
      }
    } catch (error) {
      console.error("Error while converting Tokens:", error.message);
      throw new Error("Error while converting Tokens: " + error.message);
    }
  }

  // @Cron('0 */20 * * * *')
  async removeUselessTokens() {
    try {
      await this.tokenService.updateIsValidForOldTokens();
    } catch (error) {
      console.log(error);
      throw new Error("Error while converting Tokens: " + error.message);
    }
  }

  onModuleDestroy() {
    this.logger.verbose("Destroying Gainer Service...");
    // Perform any necessary cleanup here
  }

  onModuleInit() {
    this.logger.verbose("Initializing Shit Coin Service...");
    this.connection = new Connection(this.configService.RPC_URL, {
      wsEndpoint: "wss://api.mainnet-beta.solana.com",
    });
    // this.runProgram().catch((error) =>
    //   this.logger.error('Error in runProgram', error),
    // );
  }

  async main() {
    this.logger.verbose("Monitoring logs...", this.raydium.toString());
    this.connection.onLogs(
      this.raydium,
      ({ logs, err, signature }) => {
        if (err) return;
        if (logs && logs.some((log) => log.includes("initialize2") && !this.processedSignatures.has(signature))) {
          this.processedSignatures.add(signature);
          this.logger.verbose("Signature for Initialize2:", signature);
          this.fetchRadiumTokenDetails(signature).catch((error) =>
            this.logger.error("Error in fetchRaydiumAccounts", error)
          );
        }
      },
      "finalized"
    );
  }

  async fetchRadiumTokenDetails(signature: string) {
    try {
      const txId = signature;
      const tx: any = await this.connection.getParsedTransaction(txId, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      const accounts = tx?.transaction?.message?.instructions.find(
        (ix) => ix.programId.toBase58() === this.RAYDIUM_PUBLIC_KEY
      )?.accounts;

      if (!accounts) {
        this.logger.verbose("No accounts were found in the transaction.");
        return;
      }

      // Extracting relevant accounts based on their indexes
      const tokenAIndex = 8;
      const tokenBIndex = 9;
      const tokenAAccount = accounts[tokenAIndex].toBase58();
      const tokenBAccount = accounts[tokenBIndex].toBase58();
      const pair = accounts[4].toBase58();

      // Log the discovery of tokens
      this.logger.verbose("Tokens and pair identified in the transaction.");

      // Filtering out tokens associated with the excluded token
      const excludedToken = "So11111111111111111111111111111111111111112";
      const filterTokens = (tokenA: string, tokenB: string): string | null => {
        return tokenA.includes(excludedToken) ? tokenB : tokenA.includes(excludedToken) ? null : tokenA;
      };
      const toSaveToken = filterTokens(tokenAAccount, tokenBAccount);

      // Log the URL for transaction exploration
      this.logger.verbose(`Transaction details can be viewed at: ${this.generateExplorerUrl(txId)}`);

      // Retrieve token metadata
      const tokenDetails = await this.radiumService.getTokenMetadataFromMetaplex(toSaveToken);

      await this.shitTokenLogsToFile(`Got new Token: ${tokenDetails.tokenName}, Symbol: ${tokenDetails.tokenSymbol}`);

      // if (toSaveToken.includes('pump')) {
      //   await this.shitTokenLogsToFile(
      //     `Token identified as a potential Pump-and-Dump token with mint: ${toSaveToken}.`,
      //   );
      //   this.tokenService.addToken(
      //     tokenDetails,
      //     toSaveToken,
      //     pair,
      //     this.solTradeAmount,
      //     0,
      //     0,
      //     0,
      //     `Token identified as a potential Pump-and-Dump token with mint: ${toSaveToken}.`,
      //     false,
      //     true
      //   );
      //   return;
      // }

      // Check if the token is frozen
      const isTokenFreezed = await this.web3Service.getTokenFreezeAuthority(toSaveToken);
      if (isTokenFreezed) {
        await this.shitTokenLogsToFile(
          `Token is frozen; trading halted for ${toSaveToken} with authority: ${isTokenFreezed}.`
        );
        this.tokenService.addToken(
          tokenDetails,
          toSaveToken,
          pair,
          this.solTradeAmount,
          0,
          0,
          0,
          `Token is frozen; trading halted for ${toSaveToken} with authority: ${isTokenFreezed}.`,
          false,
          true
        );
        return;
      }

      const isMintEnabled = await this.web3Service.getTokenMintAuthority(toSaveToken);
      if (isMintEnabled) {
        await this.shitTokenLogsToFile(
          `Token has mint authority enabled; trading halted for ${toSaveToken} with authority: ${isMintEnabled}.`
        );
        this.tokenService.addToken(
          tokenDetails,
          toSaveToken,
          pair,
          this.solTradeAmount,
          0,
          0,
          0,
          `Token has mint authority enabled; trading halted for ${toSaveToken} with authority: ${isMintEnabled}.`,
          false,
          true
        );
        return;
      }

      this.logger.verbose(`Token ${toSaveToken} is active and eligible for trading.`);

      // Log the token's details including expected trading amounts and liquidity
      const { amountOut, minAmountOut, liquidityAvailable } = await this.retrieveTokenTradingDetails(toSaveToken, pair);
      this.logger.verbose(
        `Token Address: ${toSaveToken}, Minimum Get: ${minAmountOut}, Maximum Get: ${amountOut}, Liquidity Available: ${liquidityAvailable}`
      );

      // Decision based on liquidity
      if (liquidityAvailable < 1000) {
        await this.shitTokenLogsToFile(
          `Insufficient liquidity (${liquidityAvailable}) available for token ${toSaveToken} to proceed.`
        );
        this.tokenService.addToken(
          tokenDetails,
          toSaveToken,
          pair,
          this.solTradeAmount,
          minAmountOut,
          amountOut,
          liquidityAvailable,
          `Insufficient liquidity (${liquidityAvailable}) available for token ${toSaveToken} to proceed.`,
          false,
          true
        );
        return;
      }

      // Process potential buying
      this.isOneSaved += 1;

      this.tokenArray.push({
        tokenName: tokenDetails.tokenName,
        tokenSymbol: tokenDetails.tokenSymbol,
        tokenDecimals: tokenDetails.decimals,
        tokenMintAddress: toSaveToken,
        solanaAddress: "So11111111111111111111111111111111111111112",
        lpPairAddress: pair,
        buyPrice: this.solTradeAmount,
        minGet: minAmountOut,
        maxGet: amountOut,
        liquidityAvailable: liquidityAvailable,
      });

      this.tokenService.addToken(
        tokenDetails,
        toSaveToken,
        pair,
        this.solTradeAmount,
        minAmountOut,
        amountOut,
        liquidityAvailable,
        "",
        true,
        false
      );

      await this.shitTokenLogsToFile(
        `Liquidity (${liquidityAvailable}) available for token ${toSaveToken} yes please proceed.`
      );

      return;
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async comparePrices(newPrice, savedToken, index) {
    try {
      const { amountOut, minAmountOut, liquidityAvailable } = newPrice;

      // Log current and previous state
      // this.logger.verbose(`Token Address: ${savedToken.tokenMintAddress}`);
      // this.logger.verbose(
      //   `Previous Liquidity Availability: ${savedToken.liquidityAvailable}`,
      // );
      // this.logger.verbose(
      //   `Updated Liquidity Availability: ${liquidityAvailable}`,
      // );
      // this.logger.verbose(`Updated in Minimum Get: ${minAmountOut}`);
      // this.logger.verbose(`Updated in Maximum Get: ${amountOut}`);

      // Update token liquidity
      await this.tokenService.updateToken(
        savedToken.tokenMintAddress,
        liquidityAvailable,
        `Liquidity went to ${liquidityAvailable}`
      );

      if (Number(liquidityAvailable) < 1000) {
        await this.logHelper(
          `Major Decrease in liquidity observed for token ${savedToken.tokenMintAddress} as now liquidity is ${liquidityAvailable}. Going to remove the token`
        );

        this.tokenArray.splice(index, 1);
        await this.tokenService.updateToken(
          savedToken.tokenMintAddress,
          liquidityAvailable,
          `Major Decrease in liquidity observed for token ${savedToken.tokenMintAddress} as now liquidity is ${liquidityAvailable}. Going to remove the token`,
          false
        );
      }

      // Determine change in liquidity
      if (liquidityAvailable < savedToken.liquidityAvailable) {
        await this.logHelper(
          `Decrease in liquidity observed for token ${savedToken.tokenMintAddress} as now liquidity is ${liquidityAvailable}.`
        );
        await this.tokenService.updateNegativeLiquid(savedToken.tokenMintAddress, liquidityAvailable);
      } else if (liquidityAvailable > savedToken.liquidityAvailable) {
        await this.logHelper(
          `Increase in liquidity observed for token ${savedToken.tokenMintAddress} as now liquidity is ${liquidityAvailable}.`
        );

        await this.tokenService.updatePositiveLiquid(savedToken.tokenMintAddress, liquidityAvailable);
      } else {
        await this.logHelper(
          `No significant change in liquidity for token ${savedToken.tokenMintAddress} as now liquidity is ${liquidityAvailable}.`
        );
      }

      // Log final state
      const logEntries = [
        `Token Address: ${savedToken.tokenMintAddress}`,
        `Previous Liquidity Availability: ${savedToken.liquidityAvailable}`,
        `Updated Liquidity Availability: ${liquidityAvailable}`,
      ];
      const finalLogEntry = logEntries.join(", ");
      await this.logToFile(finalLogEntry);

      // this.logger.verbose('--------------------------------');
    } catch (error) {
      console.log(error);
      this.logger.error(`Error in comparePrices: ${error.message}`);
    }
  }

  async retrieveTokenTradingDetails(tokenMintAddress: string, pair: string) {
    try {
      return await this.radiumService.getTheTokenPrice(
        tokenMintAddress,
        "So11111111111111111111111111111111111111112",
        pair,
        1
      );
    } catch (error) {
      this.logger.error(`Failed to retrieve trading details for ${tokenMintAddress}, attempting again.`);
      return await this.radiumService.getTheTokenPrice(
        tokenMintAddress,
        "So11111111111111111111111111111111111111112",
        pair,
        1
      );
    }
  }

  generateExplorerUrl(txId: string): string {
    return `https://solscan.io/tx/${txId}?cluster=mainnet`;
  }

  async runProgram() {
    try {
      this.tokenArray = await this.tokenService.getUndraftedTokens();
      await this.main();
    } catch (error) {
      this.logger.error("Error occurred:", error);
      this.logger.verbose("Restarting the program...");
      await this.sleep(2000);
      this.runProgram();
    }
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async logHelper(text: string) {
    this.logger.verbose(text);
    await this.logToFile(text);
  }

  /**
   * Logs a message with a timestamp to a specified log file.
   * If the file does not exist, it will be created.
   * Each log entry is appended on a new line.
   * @param message The message to log.
   */
  async logToFile(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`; // Create a formatted log entry

    try {
      return;
      return await fs.promises.appendFile(this.logFilePath, logEntry, "utf-8");
      // console.log('Log entry added to file successfully.');
    } catch (error) {
      console.error("Failed to log to file:", error);
    }
  }

  /**
   * Logs a message with a timestamp to a specified log file.
   * If the file does not exist, it will be created.
   * Each log entry is appended on a new line.
   * @param message The message to log.
   */
  async shitTokenLogsToFile(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`; // Create a formatted log entry

    try {
      return;
      return await fs.promises.appendFile(this.logLiquidityFilePath, logEntry, "utf-8");
      // console.log('Log entry added to file successfully.');
    } catch (error) {
      console.error("Failed to log to file:", error);
    }
  }
}
