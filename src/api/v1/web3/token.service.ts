import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  Connection,
  Keypair,
  ParsedConfirmedTransaction,
  ParsedTransaction,
  ParsedTransactionWithMeta,
  PublicKey,
} from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import * as bs58 from "bs58";
import { ConfigService } from "../../../config/config.service";
import { TxVersion } from "@raydium-io/raydium-sdk-v2";
import { InjectModel } from "@nestjs/mongoose";
import { TokenEntity, TokenDocument } from "./entity/token.entity";
import * as notifier from "node-notifier";
import * as path from "path";
import { Model as MongooseModel } from "mongoose";
import axios from "axios";
import * as fs from "fs";
import * as readline from "readline";
import { TokenTransactionEntity, TokenTransactionDocument } from "./entity/token_transactions.entity";
import Moralis from "moralis";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { RadiumWalletEntity, RadiumWalletDocument } from "./entity/radium_wallets.entity";
import { WalletEntity, WalletDocument } from "./entity/wallet.entity";
import { Web3Service } from "./web3.service";

const MEMO_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";

@Injectable()
export class TokenService {
  k;
  private readonly logger = new Logger(TokenService.name);
  private readonly liquidityCheckValue = 100000;
  connection: Connection;
  wallet: Wallet;
  constructor(
    private readonly config: ConfigService,
    @InjectModel(TokenEntity.name)
    private readonly token_model: MongooseModel<TokenDocument>,
    @InjectModel(TokenTransactionEntity.name)
    private readonly token_tx_model: MongooseModel<TokenTransactionDocument>,
    @InjectModel(RadiumWalletEntity.name)
    private readonly radium_wallet_model: MongooseModel<RadiumWalletDocument>,
    @InjectModel(WalletEntity.name)
    private readonly wallet_model: MongooseModel<WalletDocument>,
    @Inject("SolMoralis") private readonly moralis: typeof Moralis,
    private readonly web3_service: Web3Service
  ) {
    this.connection = new Connection(this.config.RPC_URL, {
      commitment: "confirmed",
    });
    this.wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(bs58.decode(this.config.WALLET_PRIVATE_KEY))));
  }

  async getUndraftedTokens() {
    try {
      return await this.token_model.find({ isValid: true, isGainer: false });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async addToken(
    tokenDetails: any,
    toSaveToken: string,
    pair: string,
    toBuyTokensForSolAmount: number,
    minAmountToOut: number,
    amountToOut: number,
    totalLiquidityAvailable: number,
    reason: string,
    isValid: boolean,
    is_token_shit: boolean
  ) {
    return await this.token_model.create({
      tokenName: tokenDetails.tokenName,
      tokenSymbol: tokenDetails.tokenSymbol,
      tokenDecimals: tokenDetails.decimals,
      tokenMintAddress: toSaveToken,
      solanaAddress: "So11111111111111111111111111111111111111112",
      lpPairAddress: pair,
      buyPrice: toBuyTokensForSolAmount,
      minGet: minAmountToOut,
      maxGet: amountToOut,
      liquidityFound: totalLiquidityAvailable,
      liquidityAvailable: totalLiquidityAvailable,
      maxLiquidity: totalLiquidityAvailable,
      minLiquidity: totalLiquidityAvailable,
      reason: reason,
      recievedAt: `${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, "0")}`,
      isValid: isValid,
      wasFutureGainer: totalLiquidityAvailable > this.liquidityCheckValue ? true : false,
      createdAt: new Date(),
      is_token_shit,
    });
  }

  async getTokens(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const tokens = await this.token_model
      .find(
        {},
        {
          tokenName: 1,
          tokenSymbol: 1,
          tokenMintAddress: 1,
          lpPairAddress: 1,
        }
      )
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total_tokens = await this.token_model.countDocuments();

    return {
      tokens,
      totalTokens: total_tokens,
      totalPages: Math.ceil(total_tokens / limit),
      currentPage: page,
    };
  }

  async updateToken(mintId: any, liquidityAvailable: number, reason = "", isValid = true) {
    try {
      const now = new Date(); // Get the current date and time
      const checkTimestamp = now.getTime(); // Unix timestamp in milliseconds

      // Format the date and time into a single string
      const checkTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now
        .getDate()
        .toString()
        .padStart(2, "0")} ${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      liquidityAvailable > this.liquidityCheckValue
        ? notifier.notify({
            title: `Mint Id ${mintId}`,
            message: `Token has reacehed Liquidity ${liquidityAvailable}`,
          })
        : "";
      return await this.token_model.updateOne(
        { tokenMintAddress: mintId },
        {
          liquidityAvailable,
          reason,
          isValid: liquidityAvailable < 10000 ? false : true,
          isGainer: liquidityAvailable > this.liquidityCheckValue ? true : false,
          liquidityWentToZeroAt: liquidityAvailable < 10000 ? checkTime : "",
        }
      );
    } catch (error) {
      this.logger.error(`Error updating token: ${error.message}`);
    }
  }

  async updateIsValidForOldTokens() {
    try {
      const threeHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      // Find tokens that meet the criteria
      const tokens = await this.token_model.find({
        createdAt: { $lt: threeHoursAgo },
        liquidityAvailable: { $lt: 1000 },
        isValid: true,
      });

      if (tokens.length > 0) {
        // Update each token's isValid field to false
        for (const token of tokens) {
          await this.token_model.updateOne(
            { _id: token._id },
            {
              isValid: false,
              reason: "Monitored the token for more than 3 hours and it was a shit token",
              updatedAt: new Date(),
            }
          );
          this.logger.verbose(`Updated token ${token.tokenMintAddress} with ID ${token._id}: set isValid to false`);
        }
      } else {
        this.logger.verbose("No tokens found that meet the criteria");
      }
    } catch (error) {
      this.logger.error(`Error updating isValid for old tokens: ${error.message}`);
    }
  }

  async getTokenDetails(tokenMintAddress: string) {
    try {
      const token = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMintAddress}`);
      console.log(token.data);

      return {
        priceNative: token.data.priceNative,
        priceUsd: token.data.priceUsd,
        txns_m5_buys: token.data.txns.m5.buys,
        txns_m5_sells: token.data.txns.m5.sells,
        txns_h1_buys: token.data.txns.h1.buys,
        txns_h1_sells: token.data.txns.h1.sells,
        txns_h6_buys: token.data.txns.h6.buys,
        txns_h6_sells: token.data.txns.h6.sells,
        txns_h24_buys: token.data.txns.h24.buys,
        txns_h24_sells: token.data.txns.h24.sells,
        volume_h24: token.data.volume.h24,
        volume_h6: token.data.volume.h6,
        volume_h1: token.data.volume.h1,
        volume_m5: token.data.volume.m5,
        priceChange_m5: token.data.priceChange.m5,
        priceChange_h1: token.data.priceChange.h1,
        priceChange_h6: token.data.priceChange.h6,
        priceChange_h24: token.data.priceChange.h24,
        liquidity_usd: token.data.liquidity.usd,
        liquidity_base: token.data.liquidity.base,
        liquidity_quote: token.data.liquidity.quote,
        fdv: token.data.fdv,
        pairCreatedAt: token.data.pairCreatedAt,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateTokenData(tokenObject: any) {
    try {
      const token = await this.token_model.findById(tokenObject._id);
      if (token) {
        const tokenDetails = (
          await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token.tokenMintAddress}`)
        )?.data.pairs[0];
        // Update token with new data
        const now = new Date(); // Get the current date and time
        const checkTimestamp = now.getTime(); // Unix timestamp in milliseconds

        // Format the date and time into a single string
        const checkTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now
          .getDate()
          .toString()
          .padStart(2, "0")} ${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
        await this.token_model.updateOne(
          { _id: tokenObject._id },
          {
            priceNative: tokenDetails.priceNative,
            priceUsd: tokenDetails.priceUsd,
            txns_m5_buys: tokenDetails.txns.m5.buys,
            txns_m5_sells: tokenDetails.txns.m5.sells,
            txns_h1_buys: tokenDetails.txns.h1.buys,
            txns_h1_sells: tokenDetails.txns.h1.sells,
            txns_h6_buys: tokenDetails.txns.h6.buys,
            txns_h6_sells: tokenDetails.txns.h6.sells,
            txns_h24_buys: tokenDetails.txns.h24.buys,
            txns_h24_sells: tokenDetails.txns.h24.sells,
            volume_h24: tokenDetails.volume.h24,
            volume_h6: tokenDetails.volume.h6,
            volume_h1: tokenDetails.volume.h1,
            volume_m5: tokenDetails.volume.m5,
            priceChange_m5: tokenDetails.priceChange.m5,
            priceChange_h1: tokenDetails.priceChange.h1,
            priceChange_h6: tokenDetails.priceChange.h6,
            priceChange_h24: tokenDetails.priceChange.h24,
            liquidity_usd: tokenDetails.liquidity.usd,
            liquidity_base: tokenDetails.liquidity.base,
            liquidity_quote: tokenDetails.liquidity.quote,
            fdv: tokenDetails.fdv,
            pairCreatedAt: tokenDetails.pairCreatedAt,
            isGainer: tokenDetails.liquidity.usd < this.liquidityCheckValue ? false : true,
            // isValid: tokenDetails.liquidity.usd < 90000 ? false : true,
            liquidityAvailable: tokenDetails.liquidity.usd,
            maxLiquidity:
              tokenDetails.liquidity.usd > token.maxLiquidity ? tokenDetails.liquidity.usd : token.maxLiquidity,
            minLiquidity:
              tokenDetails.liquidity.usd < token.minLiquidity ? tokenDetails.liquidity.usd : token.minLiquidity,
            isComfirmedGainer: false,
            liquidityWentToZeroAt: tokenDetails.liquidity.usd < 10000 ? checkTime : "",
          }
        );
        this.logger.warn(`Token ${tokenObject._id} updated successfully`);
        return tokenDetails;
      } else {
        this.logger.error(`Token with ID ${tokenObject._id} not found`);
      }
    } catch (error) {
      this.logger.error(`Error updating token data: ${error.message}`);
    }
  }

  async updateTokenForMoreThan90Holders(id: any) {
    return await this.token_model.findByIdAndUpdate(
      {
        _id: id,
      },
      {
        isValid: false,
        isTokenMoved: true,
        reason: "token has a holder for more than 90%",
      }
    );
  }

  async doesWalletExists(wallet_address: string) {
    try {
      return await this.token_tx_model.find({ tx_signer: wallet_address }).sort({ block_number: 1 }).limit(1);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getLastSignature(contract_address: string, limit: number) {
    try {
      return await this.token_tx_model
        .find({ contract_address: contract_address })
        .sort({ block_number: 1 })
        .limit(limit);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getTransactionDetailsV2(transactionHash: string) {
    try {
      const transaction = await this.connection.getParsedTransaction(transactionHash, {
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Define Raydium program IDs to check
      const raydiumProgramIds = [
        "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS", // Raydium AMM Routing
        "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // Raydium Authority V4
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium Liquidity Pool V4
      ];

      let is_raydium_integrated = false;
      let uniqueAccountIds = new Set<string>(); // To store unique account IDs

      const instructions = transaction.transaction.message.instructions;
      const inner_instructions = transaction.meta?.innerInstructions || [];
      const signer = transaction.transaction.message.accountKeys[0]?.pubkey.toBase58(); // Typically the first account in accountKeys is the signer

      // Add the signer to unique accounts
      if (signer) {
        uniqueAccountIds.add(signer);
      }

      const details = instructions
        .map((instruction) => {
          const programId = instruction.programId.toBase58();
          uniqueAccountIds.add(programId);

          // Check if the instruction involves Raydium program IDs
          if (programId && raydiumProgramIds.includes(programId)) {
            is_raydium_integrated = true;
          }

          // Add accounts to uniqueAccountIds set
          if ("accounts" in instruction) {
            instruction.accounts.forEach((account) => uniqueAccountIds.add(account.toBase58()));
          }

          // Parse details based on instruction type
          if ("parsed" in instruction && instruction.parsed?.type === "swap") {
            // Handle ParsedInstruction with 'swap' type
            return {
              sourceToken: instruction.parsed.info.tokenA,
              destinationToken: instruction.parsed.info.tokenB,
              amountIn: instruction.parsed.info.amountIn / 1e9, // Convert to SOL
              amountOut: instruction.parsed.info.amountOut / 1e9, // Convert to SOL
              programId,
            };
          } else if ("accounts" in instruction) {
            // Handle PartiallyDecodedInstruction by including accounts information
            const accounts = instruction.accounts.map((account) => account.toBase58());
            uniqueAccountIds = new Set([...uniqueAccountIds, ...accounts]);

            return {
              programId,
              accounts,
            };
          }
        })
        .filter(Boolean);

      // Extract and process inner instructions
      const innerDetails = inner_instructions.map((innerInstruction) => {
        const interactWith = innerInstruction.instructions.map((instr) => {
          const innerProgramId = instr.programId.toBase58();
          uniqueAccountIds.add(innerProgramId);

          // Check if the inner instruction involves Raydium program IDs
          if (innerProgramId && raydiumProgramIds.includes(innerProgramId)) {
            is_raydium_integrated = true;
          }

          // Check if the inner instruction is PartiallyDecodedInstruction
          const accounts =
            "accounts" in instr
              ? instr.accounts.map((account) => {
                  const accountId = account.toBase58();
                  uniqueAccountIds.add(accountId); // Add to unique account IDs
                  return accountId;
                })
              : []; // Fallback to an empty array if no accounts

          return {
            innerProgramId,
            accounts,
          };
        });
        return interactWith;
      });

      // Convert unique account IDs to an array
      const uniqueAccountIdsArray = Array.from(uniqueAccountIds);

      // Check if any unique account matches Raydium program IDs
      is_raydium_integrated = uniqueAccountIdsArray.some((id) => raydiumProgramIds.includes(id));

      // Return combined details
      return {
        signer,
        uniqueAccountIds: uniqueAccountIdsArray,
        is_raydium_integrated,
      };
    } catch (error) {
      console.error("Error fetching transaction:", error);
      throw error;
    }
  }

  // Helper function to parse transfer details from a transaction
  // Helper function to parse swap or transfer details from a transaction
  async getTransactionDetails(transactionHash: string) {
    try {
      const transaction = await this.connection.getParsedTransaction(transactionHash, {
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Define Raydium program IDs to check
      const raydiumProgramIds = [
        "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS", // Raydium AMM Routing
        "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // Raydium Authority V4
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium Liquidity Pool V4
      ];

      let isRaydium = false;
      const instructions = transaction.transaction.message.instructions;
      const inner_instructions = transaction.meta?.innerInstructions || [];
      const signer = transaction.transaction.message.accountKeys[0]?.pubkey.toBase58(); // Typically the first account in accountKeys is the signer

      const details = instructions
        .map((instruction) => {
          const programId = instruction.programId.toBase58();

          // Check if the instruction involves Raydium program IDs
          if (programId && raydiumProgramIds.includes(programId)) {
            isRaydium = true;
          }

          // Parse details based on instruction type
          if ("parsed" in instruction && instruction.parsed?.type === "swap") {
            // Handle ParsedInstruction with 'swap' type
            return {
              sourceToken: instruction.parsed.info.tokenA,
              destinationToken: instruction.parsed.info.tokenB,
              amountIn: instruction.parsed.info.amountIn / 1e9, // Convert to SOL
              amountOut: instruction.parsed.info.amountOut / 1e9, // Convert to SOL
              isRaydium,
            };
          } else if ("accounts" in instruction) {
            // Handle PartiallyDecodedInstruction by including accounts information
            const accounts = instruction.accounts.map((account) => account.toBase58());

            return {
              programId,
              accounts,
              isRaydium,
            };
          }
        })
        .filter(Boolean);

      // Extract and process inner instructions
      const innerDetails = inner_instructions.map((innerInstruction) => {
        const interactWith = innerInstruction.instructions.map((instr) => {
          const innerProgramId = instr.programId.toBase58();

          // Check if the inner instruction is PartiallyDecodedInstruction
          const accounts = "accounts" in instr ? instr.accounts.map((account) => account.toBase58()) : []; // Fallback to an empty array if no accounts

          return {
            innerProgramId,
            accounts,
          };
        });
        return interactWith;
      });

      // Return combined details
      return {
        details,
        signer,
        innerDetails,
      };
    } catch (error) {
      console.error("Error fetching transaction:", error);
      throw error;
    }
  }

  async getSniperWallets(contract_address: string, records: number = 10) {
    try {
      const wallets = await this.radium_wallet_model
        .find({
          contract_address: contract_address,
        })
        .sort({ block_number: 1 }) // Sorts by block_number in ascending order
        .limit(records)
        .select("tx_signer block_number"); // Limits the result to 10 records;

      return wallets;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAllWallets() {
    try {
      return await this.radium_wallet_model.find(); // Sorts by block_number in ascending order
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async filterRadiumWallets(contract_address: string) {
    try {
      const transactions = await this.token_tx_model.find({
        contract_address: contract_address,
      });

      // Using a Map to ensure unique tx_signer values with their respective block_number
      const uniqueWalletsMap = new Map<string, { tx_signer: string; block_number: number }>();

      for (const transaction of transactions) {
        if (transaction.tx_hash && transaction.block_number && transaction.tx_signer) {
          const { is_raydium_integrated } = await this.getTransactionDetailsV2(transaction.tx_hash);

          if (is_raydium_integrated) {
            // Add to the map if tx_signer is unique, keeping the latest block_number
            uniqueWalletsMap.set(transaction.tx_signer, {
              tx_signer: transaction.tx_signer,
              block_number: transaction.block_number,
            });
          }
        }
      }

      // Remove existing records with the same contract_address
      await this.radium_wallet_model.deleteMany({
        contract_address: contract_address,
      });

      // Insert unique wallets from the map
      for (const transaction of uniqueWalletsMap.values()) {
        try {
          await this.radium_wallet_model.create({
            contract_address: contract_address,
            tx_signer: transaction.tx_signer,
            block_number: transaction.block_number,
          });
        } catch (error) {
          // Check if error is a duplicate key error and log it instead of throwing
          if (error.code === 11000) {
            console.warn(`Duplicate key error: Wallet with tx_signer ${transaction.tx_signer} already exists.`);
            continue; // Skip this entry and move to the next
          } else {
            // Throw other types of errors
            throw error;
          }
        }
      }

      return Array.from(uniqueWalletsMap.values());
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getWalletPortfolio(walletAddress: string) {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Fetch the native SOL balance
      const balanceLamports = await this.connection.getBalance(publicKey);
      const balanceSol = balanceLamports / 1e9; // Convert lamports to SOL

      console.log(`Wallet balance: ${balanceSol} SOL`);

      // Fetch all SPL token accounts owned by the wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      // Process each token account to get token balances
      const tokenBalances = tokenAccounts.value.map((tokenAccount) => {
        const tokenInfo = tokenAccount.account.data.parsed.info;
        return {
          mint: tokenInfo.mint, // Token mint address
          balance: tokenInfo.tokenAmount.uiAmount, // Balance in the token's units
        };
      });

      // Log token balances
      tokenBalances.forEach((token) => {
        console.log(`Token Mint: ${token.mint}, Balance: ${token.balance}`);
      });

      return {
        solBalance: balanceSol,
        tokens: tokenBalances,
      };
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw error;
    }
  }

  async getWalletBalance(walletAddress: string) {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Fetch the native SOL balance
      const balanceLamports = await this.connection.getBalance(publicKey);
      const balanceSol = balanceLamports / 1e9; // Convert lamports to SOL

      console.log(`Wallet balance: ${balanceSol} SOL`);

      return {
        solBalance: balanceSol,
      };
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw error;
    }
  }

  async updateRadiumWallet(walletAddress: string, sol_balance: number) {
    try {
      await this.radium_wallet_model.findOneAndUpdate({ tx_signer: walletAddress }, { wallet_balance: sol_balance });
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw error;
    }
  }

  async getUnscrappedToken() {
    try {
      return await this.token_model.findOne({
        are_transactions_scraped: false,
        is_token_shit: false,
        isValid: false,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateUnscrappedTokenBool(token_id: string) {
    try {
      await this.token_model.findByIdAndUpdate(token_id, {
        are_transactions_scraped: true,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getUnfilteredToken() {
    try {
      return await this.token_model.findOne({
        are_transactions_scraped: true,
        are_transactions_filtered: false,
        is_token_shit: false,
        isValid: false,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateUnfilteredTokenBool(token_id: string) {
    try {
      await this.token_model.findByIdAndUpdate(token_id, {
        are_transactions_filtered: true,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updatePositiveLiquid(mintId, maxLiquidity, reason = "") {
    try {
      const token = await this.token_model.findOne({
        tokenMintAddress: mintId,
      });
      if (token) {
        if (maxLiquidity > token.maxLiquidity) {
          await this.token_model.updateOne(
            { tokenMintAddress: mintId },
            {
              maxLiquidity,
              reason,
            }
          );
        } else {
          this.logger.verbose(
            `New maxLiquidity ${maxLiquidity} is not greater than the current value ${token.maxLiquidity}`
          );
        }
      } else {
        this.logger.error(`Token with mint ID ${mintId} not found`);
      }
    } catch (error) {
      this.logger.error(`Error updating positive liquidity: ${error.message}`);
    }
  }

  async updateNegativeLiquid(mintId, minLiquidity, reason = "") {
    try {
      const token = await this.token_model.findOne({
        tokenMintAddress: mintId,
      });
      if (token) {
        if (minLiquidity < token.minLiquidity) {
          await this.token_model.updateOne(
            { tokenMintAddress: mintId },
            {
              minLiquidity,
              reason,
            }
          );
        } else {
          this.logger.verbose(
            `New minLiquidity ${minLiquidity} is not less than the current value ${token.minLiquidity}`
          );
        }
      } else {
        this.logger.error(`Token with mint ID ${mintId} not found`);
      }
    } catch (error) {
      this.logger.error(`Error updating negative liquidity: ${error.message}`);
    }
  }

  // Create a new wallet
  async createOrUpdateWallet(walletData: { wallet_address: string; wallet_balance: number }) {
    try {
      console.log("Processing wallet ", walletData.wallet_address);

      // Check if the wallet already exists
      const existingWallet = await this.wallet_model.findOne({ wallet_address: walletData.wallet_address });

      if (existingWallet) {
        // Wallet exists; update the balance
        console.log("Wallet exists. Updating balance.");
        existingWallet.wallet_balance = walletData.wallet_balance;
        existingWallet.updatedAt = new Date(); // Update the timestamp
        return await existingWallet.save();
      } else {
        // Wallet does not exist; create a new wallet
        console.log("Wallet does not exist. Creating new wallet.");
        const newWallet = new this.wallet_model({
          ...walletData,
          createdAt: new Date(),
        });
        return await newWallet.save();
      }
    } catch (error) {
      this.logger.error(`Error processing wallet: ${error.message}`);
      throw error;
    }
  }

  async getWallets() {
    try {
      const wallets = await this.wallet_model.find();
      return wallets;
    } catch (error) {
      this.logger.error(`Error retrieving wallets: ${error.message}`);
      throw error;
    }
  }

  // Retrieve wallets with pagination
  async getWalletsByPagination(page: number, limit: number) {
    const offset = (page - 1) * limit;
    try {
      const wallets = await this.wallet_model
        .find({}, { wallet_address: 1, pnl: 1, roi: 1 })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
      const totalWallets = await this.wallet_model.countDocuments();

      return {
        wallets,
        totalWallets,
        totalPages: Math.ceil(totalWallets / limit),
        currentPage: page,
      };
    } catch (error) {
      this.logger.error(`Error retrieving wallets: ${error.message}`);
      throw error;
    }
  }

  // Update wallet by wallet address
  async updateWallet(
    walletAddress: string,
    updateData: Partial<{
      total_transactions_count: string;
      radium_transactions_count: string;
    }>
  ) {
    try {
      // Ensure that only numerical comparisons are made
      const formattedUpdateData: Record<string, any> = {};
      if (updateData.total_transactions_count !== undefined) {
        formattedUpdateData.total_transactions_count = {
          $max: Number(updateData.total_transactions_count),
        };
      }
      if (updateData.radium_transactions_count !== undefined) {
        formattedUpdateData.radium_transactions_count = {
          $max: Number(updateData.radium_transactions_count),
        };
      }

      return await this.wallet_model.updateOne(
        { wallet_address: walletAddress },
        {
          $setOnInsert: { wallet_address: walletAddress }, // Ensure wallet exists if not created
          ...formattedUpdateData,
        },
        { upsert: true } // Optional: Create if not exist
      );
    } catch (error) {
      this.logger.error(`Error updating wallet: ${error.message}`);
      throw error;
    }
  }

  // Delete wallet by wallet address
  async deleteWallet(walletAddress: string) {
    try {
      return await this.wallet_model.deleteOne({
        wallet_address: walletAddress,
      });
    } catch (error) {
      this.logger.error(`Error deleting wallet: ${error.message}`);
      throw error;
    }
  }

  async getWalletGreaterThanZero() {
    try {
      console.log("Getting the Wallets");
      let wallet_array = [];
      const batchSize = 100; // Size of each batch
      const wallets = await this.radium_wallet_model.find();
      console.log("Got the Wallets");

      for (let i = 0; i < wallets.length; i += batchSize) {
        const batch = wallets.slice(i, i + batchSize); // Get the current batch
        console.log("Current Batch ", batch);

        // Process each wallet in the batch
        const batchResults = await Promise.all(
          batch.map(async (wallet) => {
            try {
              const { solBalance } = await this.getWalletBalance(wallet.tx_signer);
              console.log("Wallet Address", wallet.tx_signer, "Balance:", solBalance);
              if (Number(solBalance) > 5) {
                await this.updateRadiumWallet(wallet.tx_signer, solBalance);
                try {
                  await this.createOrUpdateWallet({
                    wallet_address: wallet.tx_signer,
                    wallet_balance: solBalance,
                  });
                } catch (error) {
                  // Check if error is a duplicate key error and log it instead of throwing
                  if (error.code === 11000) {
                    console.warn(`Duplicate key error: Wallet with address ${wallet.tx_signer} already exists.`);
                  }
                }
                return wallet.tx_signer; // Return valid wallet
              }
            } catch (error) {
              console.error(`Error fetching balance for wallet ${wallet.tx_signer}:`, error.message);
            }
            return null; // Return null for wallets with errors or not meeting the criteria
          })
        );

        // Filter out nulls and add valid wallets to the array
        wallet_array.push(...batchResults.filter((wallet) => wallet !== null));
      }

      return "JOB FINSISHED";
    } catch (error) {
      console.error("An error occurred during wallet processing:", error.message);
      throw new Error(error.message); // Optional: You can decide whether to rethrow the error or just log it
    }
  }

  async getWalletSwapTransactionsDetail() {
    try {
      const wallets = await this.wallet_model.find();

      for (const wallet of wallets) {
        try {
          console.log("Processing wallet:", wallet.wallet_address);

          const wallet_details = await this.web3_service.getUserWalletPortfolio(wallet.wallet_address);

          // Update the wallet with fetched details
          await this.updateWallet(wallet.wallet_address, {
            total_transactions_count: String(wallet_details.total_txs),
            radium_transactions_count: String(wallet_details.radium_swaps),
          });

          await this.web3_service.sleep(100);

          console.log(`Updated wallet: ${wallet.wallet_address}`);
        } catch (error) {
          console.error(`Error updating wallet ${wallet.wallet_address}:`, error.message);

          // Mark the wallet as errored in the database
          await this.wallet_model.updateOne({ wallet_address: wallet.wallet_address }, { is_error: true });
        }
      }

      console.log("Job Finished");
      return "JOB FINISHED";
    } catch (error) {
      console.error("Error while processing wallets:", error);
      throw new Error("Error while processing wallets: " + error.message);
    }
  }

  async getWalletPNL() {
    const wallets = await this.wallet_model.find({is_error: false});
    try {
      for (const wallet of wallets) {
        try {
          if (!wallet) {
            throw new Error(`Wallet with address ${wallet.wallet_address} not found`);
          }
  
          const token = await axios.get(
            `https://feed-api.cielo.finance/api/v1/${wallet.wallet_address}/pnl/total-stats?chains=solana`,
            {
              headers: {
                "X-API-KEY": this.config.CIELO_API_KEY,
                accept: "application/json",
              },
            }
          );
  
          await this.wallet_model.findByIdAndUpdate(wallet.id, {
            realized_pnl_usd: token.data.data.realized_pnl_usd,
            realized_roi_percentage: token.data.data.realized_roi_percentage,
            tokens_traded: token.data.data.tokens_traded,
            unrealized_pnl_usd: token.data.data.unrealized_pnl_usd,
            unrealized_roi_percentage: token.data.data.unrealized_roi_percentage,
            winrate: token.data.data.winrate,
            average_holding_time: token.data.data.average_holding_time,
            combined_pnl_usd: token.data.data.combined_pnl_usd,
            combined_roi_percentage: token.data.data.combined_roi_percentage,
            is_error: false, // Set is_error to false if everything succeeds
          });
  
          await this.web3_service.sleep(1000);
          console.log(`Updated wallet: ${wallet.wallet_address}`);
          console.log(token.data.data);
  
        } catch (error) {
          // Set is_error to true in case of any error
          if (wallet.wallet_address) {
            await this.wallet_model.updateOne(
              { wallet_address: wallet.wallet_address },
              { is_error: true, error_message: error.response?.data?.message || "Unable to get error" }
            );
          }
  
          console.log(error.response?.data?.message);
          this.logger.error(`Error fetching wallet PNL for ${wallet.wallet_address}: ${error.response?.data?.message}`);
        }
      }
      console.log("Job Finished");
      return "JOB FINISHED";
    } catch (error) {
      throw new Error("Error while processing pnls: " + error.message);
    }
  }
}
