import { Injectable } from "@nestjs/common";
import { ConfigService } from "../../../config/config.service";
import Moralis from "moralis";
import axios from "axios";
const { SolNetwork } = require("@moralisweb3/common-sol-utils");
import { Connection, PublicKey, Keypair, ParsedTransactionWithMeta } from "@solana/web3.js";
import { any } from "joi";
import { AddressLookupTableAccount } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { Wallet, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import * as bs58 from "bs58";
import { getAccount, getMint } from "@solana/spl-token";
import { METADATA_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { InjectModel } from "@nestjs/mongoose";
import { TokenTransactionEntity, TokenTransactionDocument } from "./entity/token_transactions.entity";
import { Model as MongooseModel } from "mongoose";

interface MetadataResponse {
  name: string;
  symbol: string;
  uri: string;
}
type WalletTokenAccounts = Awaited<ReturnType<typeof any>>;

@Injectable()
export class Web3Service {
  private readonly tokenLiquidityLogsPath = "./logs/token_liquidity_logs.json";
  private readonly connection;
  private readonly wallet;
  private readonly provider;
  buyArray = []; // Store indices of wallets that have bought

  private readonly mainWalletDir = "./main_wallets";

  lookupTables: Map<string, AddressLookupTableAccount> | any;
  addressesForLookupTable: Map<string, Set<string>> | any;
  lookupTablesForAddress: Map<string, Set<string>> | any;
  constructor(
    private readonly config: ConfigService,
    @InjectModel(TokenTransactionEntity.name)
    private readonly token_tx_model: MongooseModel<TokenTransactionDocument>
  ) {
    this.lookupTables = new Map();
    this.lookupTablesForAddress = new Map();
    this.addressesForLookupTable = new Map();

    this.wallet = this.wallet = new Wallet(
      Keypair.fromSecretKey(Uint8Array.from(bs58.decode(this.config.WALLET_PRIVATE_KEY)))
    );
    // this.bumperWallet = Keypair.fromSecretKey(
    //   bs58.decode(this.config.BUMPER_WALLET_PRIVATE_KEY),
    // );

    // this.volumeWallet = Keypair.fromSecretKey(
    //   bs58.decode(this.config.VOLUME_WALLET_PRIVATE_KEY),
    // );

    this.connection = new Connection(this.config.RPC_URL, {
      // RPC URL HERE
      commitment: "confirmed",
    });
    this.provider = new AnchorProvider(this.connection, this.wallet as any, {});
    setProvider(this.provider);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getTokenStats(tokenAddress: string) {
    const response = await Moralis.SolApi.token.getTokenPrice({
      network: "mainnet",
      address: tokenAddress,
    });

    console.log(response.raw);
    return response.raw;
  }

  async getTokenMetadataFromMoralis(tokenAddress: string): Promise<MetadataResponse> {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": this.config.MORALIS_PUB_KEY,
      },
    };

    try {
      const response: Response = await fetch(
        `https://solana-gateway.moralis.io/token/mainnet/${tokenAddress}/metadata`,
        options
      );
      if (!response.ok) {
        throw new Error(`Error fetching token metadata: ${response.statusText}`);
      }
      const data: MetadataResponse = await response.json();
      console.log("DATA ", data);
      return data;
    } catch (error) {
      console.log(error);
      throw new Error(`Error fetching token metadata: ${error.message}`);
    }
  }

  async getTokenPriceInSOL(tokenMintAddress) {
    try {
      // Fetch token price in USD from a reliable API
      const tokenPriceResponse = await axios.get(
        `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${tokenMintAddress}&vs_currencies=usd`
      );
      const tokenPriceInUSD = tokenPriceResponse.data[tokenMintAddress.toLowerCase()].usd;

      // Fetch SOL price in USD from a reliable API
      const solPriceResponse = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      const solPriceInUSD = solPriceResponse.data.solana.usd;

      // Calculate the token price in SOL
      const tokenPriceInSOL = tokenPriceInUSD / solPriceInUSD;

      return tokenPriceInSOL;
    } catch (error) {
      console.log("Error fetching token price:", error);
      return null;
    }
  }

  async getSolTokenBalance(tokenAddress: string) {
    try {
      const network = SolNetwork.MAINNET;
      const response = await Moralis.SolApi.token.getTokenPrice({
        address: tokenAddress,
        network,
      });
      console.log(response.toJSON());
    } catch (error) {
      console.log("Error fetching token");
      return "Error fetching token";
    }
  }

  async getTokenPriceBirdsEye(token: string) {
    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-KEY": "a7537812032a44cb81cf0145a65e6c01",
      },
      body: JSON.stringify({
        list_address: `So11111111111111111111111111111111111111112,${token}`,
      }),
    };

    try {
      const response = await fetch("https://public-api.birdeye.so/defi/multi_price?include_liquidity=false", options);
      const data = await response.json();

      // Extract the price data for SOL and the specified token
      const solPrice = data.data["So11111111111111111111111111111111111111112"];
      const tokenPrice = data.data[token];

      // Return the extracted prices
      return {
        solPrice,
        tokenPrice,
      };
    } catch (err) {
      console.error(err);
      throw new Error("Failed to fetch token prices");
    }
  }

  isValidSolanaAddress(address: PublicKey) {
    try {
      // This will throw an error if the address is not valid
      new PublicKey(address);
      return true; // The address is valid if no error is thrown
    } catch (e) {
      return false; // The address is invalid
    }
  }

  async getJitoTipAccount() {
    try {
      const jitpTipAccounts = [
        "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
        "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
        "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
        "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
        "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
        "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
        "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
        "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
      ];

      return jitpTipAccounts[Math.floor(Math.random() * jitpTipAccounts.length)];
    } catch (error) {
      return "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY";
    }
  }

  async preaperWalletsForRugPull() {
    try {
      const bumper = Keypair.generate();
      const bumperFilename = `bumper-${bumper.publicKey.toString()}.json`;
      const bumperFilePath = path.join(this.mainWalletDir, bumperFilename);
      fs.writeFileSync(bumperFilePath, JSON.stringify(Array.from(bumper.secretKey)));
      console.log(`Bumper Wallet Public Key: ${bumper.publicKey.toString()}`);
      console.log(`Bumper Wallet Private Key: ${bs58.encode(bumper.secretKey)}\n`);

      const pfun = Keypair.generate();
      const pfunFilename = `pfun-${pfun.publicKey.toString()}.json`;
      const pfunFilePath = path.join(this.mainWalletDir, pfunFilename);
      fs.writeFileSync(pfunFilePath, JSON.stringify(Array.from(pfun.secretKey)));
      console.log(`Pfun Wallet Public Key: ${pfun.publicKey.toString()}`);
      console.log(`Pfun Wallet Private Key: ${bs58.encode(pfun.secretKey)}\n`);

      const volume = Keypair.generate();
      const volumeFilename = `volume-${volume.publicKey.toString()}.json`;
      const volumeFilePath = path.join(this.mainWalletDir, volumeFilename);
      fs.writeFileSync(volumeFilePath, JSON.stringify(Array.from(volume.secretKey)));
      console.log(`Volume Wallet Public Key: ${volume.publicKey.toString()}`);
      console.log(`Volume Wallet Private Key: ${bs58.encode(volume.secretKey)}\n`);

      const dev = Keypair.generate();
      const devFilename = `dev-${dev.publicKey.toString()}.json`;
      const devFilePath = path.join(this.mainWalletDir, devFilename);
      fs.writeFileSync(devFilePath, JSON.stringify(Array.from(dev.secretKey)));
      console.log(`Dev Wallet Public Key: ${dev.publicKey.toString()}`);
      console.log(`Dev Wallet Private Key: ${bs58.encode(dev.secretKey)}\n`);

      return;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getTokenFreezeAuthority(token) {
    try {
      const tokenDetails = await getMint(this.connection, new PublicKey(token));
      return tokenDetails.freezeAuthority?.toString();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getTokenMintAuthority(token) {
    try {
      // const tokenDetails = await getMint(this.connection, new PublicKey(token));
      const mintAccountInfo = await this.connection.getParsedAccountInfo(new PublicKey(token));
      // Check if the mint authority is null
      const mintAuthority = mintAccountInfo.value.data.parsed.info.mintAuthority;
      return mintAuthority;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getTokenHolders(mintAddress: string) {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const mintInfo = await getMint(this.connection, mintPublicKey);
      let totalHoldings = 0;
      const tokenSupply = mintInfo.supply;
      const largestAccounts = await this.connection.getTokenLargestAccounts(mintPublicKey);

      const holders = [];
      for (const accountInfo of largestAccounts.value) {
        const accountDetail = await getAccount(this.connection, accountInfo.address);
        const balance = accountDetail.amount;
        const percentage = (Number(balance) / Number(tokenSupply)) * 100;
        totalHoldings += Number(percentage.toFixed(4));
        holders.push({
          address: accountInfo.address.toBase58(), // Token account address
          owner: accountDetail.owner.toBase58(), // Owner's wallet address
          balance: balance.toString(), // Keep as string to avoid precision issues
          percentage: Number(percentage.toFixed(4)), // Format percentage to 4 decimal places
        });
      }
      const majorHolders = holders.filter((holder) => holder.percentage > 80);
      return {
        totalHolders: holders.length,
        areHoldersMoreThan90: totalHoldings,
        isHolderMoreThan90: majorHolders.length > 0,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getTokenHoldersWithRetry(mintAddress: string, attempts: number = 3, delay: number = 1000) {
    try {
      const { totalHolders, areHoldersMoreThan90, isHolderMoreThan90 } = await this.getTokenHolders(mintAddress);
      return { totalHolders, areHoldersMoreThan90, isHolderMoreThan90 };
    } catch (error) {
      if (attempts > 0) {
        console.log(`Attempt to get token holders amount failed, ${attempts} retries left. Error: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay)); // Exponential backoff
        return this.getTokenHoldersWithRetry(mintAddress, attempts - 1, delay * 2);
      } else {
        throw new Error("Failed to get Token Holders after several attempts: " + error.message);
      }
    }
  }

  async getTokenHoldersList(mintAddress: string) {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const mintInfo = await getMint(this.connection, mintPublicKey);
      let totalHoldings = 0;
      const tokenSupply = mintInfo.supply;
      const largestAccounts = await this.connection.getTokenLargestAccounts(mintPublicKey);

      const holders = await Promise.all(
        largestAccounts.value.map(async (accountInfo) => {
          const accountDetail = await getAccount(this.connection, accountInfo.address);
          const balance = accountDetail.amount;
          const percentage = (Number(balance) / Number(tokenSupply)) * 100;
          totalHoldings += Number(percentage.toFixed(4));
          return {
            address: accountInfo.address.toBase58(), // Token account address
            owner: accountDetail.owner.toBase58(), // Owner's wallet address
            balance: balance.toString(), // Keep as string to avoid precision issues
            percentage: Number(percentage.toFixed(4)), // Format percentage to 4 decimal places
          };
        })
      );
      return { totalHoldings, holders };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getOwnerOfSPLToken(token) {
    try {
      console.log("tokenMintAddress : ", token.tokenMintAddress);
      const tokenMintPublicKey = new PublicKey(token.tokenMintAddress);
      const metadataPDA = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), tokenMintPublicKey.toBuffer()],
        METADATA_PROGRAM_ID
      );

      const accountInfo = await this.connection.getAccountInfo(metadataPDA[0]);
      if (!accountInfo) {
        throw new Error("Metadata account not found");
      }

      const metadata = Metadata.deserialize(accountInfo.data);
      const creators = metadata[0].data.creators;

      if (!creators || creators.length === 0) {
        throw new Error("No creators found in metadata");
      }

      return creators;
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  async getTokenTransactions(token_address: string, limit: number = 1000, before: string = null): Promise<any> {
    try {
      const token_public_key = new PublicKey(token_address);
      const transactions = [];

      // Fetch transaction signatures
      const signatures = await this.connection.getSignaturesForAddress(token_public_key, { limit, before });

      if (!signatures || signatures.length === 0) {
        console.log("No transactions found.");
        return transactions;
      }

      for (const signature_info of signatures) {
        const transaction = await this.connection.getParsedTransaction(signature_info.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (transaction) {
          const signerTransaction = await this.getTransactionSignerIfInteracted(signature_info.signature);
          await this.token_tx_model.create({
            contract_address: token_address,
            tx_hash: signature_info.signature,
            tx_signer: signerTransaction.signer,
            block_number: signature_info.slot,
          });
        }
      }

      return transactions;
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      throw new Error("Failed to retrieve token transactions");
    }
  }

  async getTransactionSignerIfInteracted(transactionHash: string) {
    try {
      const raydiumProgramIds = [
        "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS", // Raydium AMM Routing
        "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // Raydium Authority V4
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium Liquidity Pool V4
      ];

      const transaction = await this.connection.getParsedTransaction(transactionHash, {
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Track if interaction with specified accounts is detected
      let interactedWithRaydium = false;
      const signer = transaction.transaction.message.accountKeys[0]?.pubkey.toBase58(); // Typically the first account in accountKeys is the signer
      // console.log("signer ", signer);

      const instructions: any = transaction.transaction.message.instructions;

      // Loop through each instruction to check for interactions with target accounts
      for (const instruction of instructions) {
        const programId = instruction.programId.toBase58();
        const accountsInvolved = instruction.accounts?.map((account) => account.toBase58());
        // console.log(accountsInvolved);

        // Check if any of the target Raydium program IDs are involved in this instruction
        if (
          raydiumProgramIds.includes(programId) ||
          accountsInvolved?.some((account) => raydiumProgramIds.includes(account))
        ) {
          interactedWithRaydium = true;
          break; // Stop further checks as we found an interaction
        }
      }

      // Return an object with both the signer and the interaction flag
      return { signer, interactedWithRaydium };
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return { signer: "", interactedWithRaydium: false };
    }
  }

  async getAllTokenTransactions(
    token_address: string,
    batchSize: number = 1000,
    before: null | string
  ): Promise<any[]> {
    let allTransactions = [];
    let hasMore = true;

    while (hasMore) {
      // Fetch a batch of transactions
      const transactions = await this.getTokenTransactions(token_address, batchSize, before);

      if (transactions.length > 0) {
        // Add the current batch to the complete list
        allTransactions = allTransactions.concat(transactions);

        // Get the signature of the last transaction in the batch to use as 'before'
        before = transactions[transactions.length - 1].signature;

        // Stop if the batch size is smaller than requested, indicating we've reached the beginning
        if (transactions.length < batchSize) {
          hasMore = false;
        }
      } else {
        // Stop if no transactions are returned
        hasMore = false;
      }
    }

    return allTransactions;
  }

  async getAllTransactionsWithRetry(
    token_address: string,
    batchSize: number = 1000,
    last_signature: string | null,
    attempts: number = 5
  ) {
    try {
      return await this.getAllTokenTransactions(token_address, batchSize, last_signature ? last_signature : null);
    } catch (error) {
      if (attempts > 0) {
        console.log(`Attempt to calculate amount failed, ${attempts} retries left. Error: ${error.message}`);
        return await this.getAllTransactionsWithRetry(
          token_address,
          batchSize,
          last_signature ? last_signature : null,
          attempts - 1
        );
      } else {
        throw new Error("Failed to sell token after several attempts: " + error.message);
      }
    }
  }

  async getSwapTransactions(wallet_address: string) {
    try {
      const publicKey = new PublicKey(wallet_address);
      const allTransactions: ParsedTransactionWithMeta[] = [];
      let beforeSignature: string | undefined;
      let hasMore = true;

      // while (hasMore) {
      // Fetch a batch of transaction signatures
      const signatures = await this.connection.getSignaturesForAddress(publicKey, {
        limit: 100, // Fetch 100 transactions at a time; adjust as needed
        // before: beforeSignature, // Start from the last fetched signature
      });

      // if (signatures.length === 0) {
      //   // No more signatures to fetch
      //   hasMore = false;
      //   break;
      // }

      // Retrieve and store each transaction by signature
      for (const { signature } of signatures) {
        const transaction = await this.connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (transaction) {
          allTransactions.push(transaction);
        }
      }

      // Update `beforeSignature` to the last fetched signature for the next batch
      beforeSignature = signatures[signatures.length - 1].signature;
      // }

      const txdetail = allTransactions.map((tx) => this.findSwapDetails(tx));

      return { txdetail };
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      throw new Error("Failed to fetch all transactions");
    }
  }

  findSwapDetails(transaction) {
    try {
      // const transaction = await this.connection.getParsedTransaction(
      //   transaction_hash,
      //   {
      //     maxSupportedTransactionVersion: 0,
      //   }
      // );

      const pre_balances = transaction.meta.preTokenBalances;
      const post_balances = transaction.meta.postTokenBalances;

      // Create a mapping of token accounts from `pre_balances` and `post_balances`
      const token_changes: { [mint: string]: any } = {};

      // Calculate the balance difference for each token
      pre_balances.forEach((pre_balance) => {
        const mint = pre_balance.mint;
        const account_index = pre_balance.accountIndex;
        const pre_amount = parseFloat(pre_balance.uiTokenAmount.uiAmount || 0);

        // Find corresponding post balance
        const post_balance = post_balances.find((pb) => pb.accountIndex === account_index && pb.mint === mint);
        if (post_balance) {
          const post_amount = parseFloat(post_balance.uiTokenAmount.uiAmount || 0);
          const balance_change = post_amount - pre_amount;

          token_changes[mint] = {
            pre_amount,
            post_amount,
            balance_change,
            token_mint: mint,
          };
        }
      });

      // Find out which tokens were swapped (positive change and negative change)
      const swapped_out: any = Object.values(token_changes).find((token: any) => token.balance_change < 0);
      const swapped_in: any = Object.values(token_changes).find((token: any) => token.balance_change > 0);

      // Constants for identifying WSOL and SOL mints
      const WSOL_MINT = "So11111111111111111111111111111111111111112";

      // Calculate the swap ratio and token names
      if (swapped_out && swapped_in) {
        const swap_ratio = Math.abs(swapped_out.balance_change / swapped_in.balance_change);

        const result = {
          swapped_out_token: swapped_out.token_mint,
          swapped_out_amount: Math.abs(swapped_out.balance_change),
          swapped_in_token: swapped_in.token_mint,
          swapped_in_amount: swapped_in.balance_change,
          swap_ratio,
          is_sol_swap: false,
          sol_amount_swapped: 0,
          tx_signature: transaction.transaction.signatures[0], // Extracting transaction signature
          swap_direction: "",
        };

        // Check if WSOL or SOL is involved in the swap and determine SOL amount
        if (swapped_out.token_mint === WSOL_MINT || swapped_in.token_mint === WSOL_MINT) {
          result.is_sol_swap = true;

          // If WSOL is swapped out, we consider it as swapping WSOL to another token
          if (swapped_out.token_mint === WSOL_MINT) {
            result.swap_direction = "WSOL_to_other_token";
            result.sol_amount_swapped = Math.abs(swapped_out.balance_change);
          }

          // If WSOL is swapped in, we consider it as swapping another token to WSOL
          if (swapped_in.token_mint === WSOL_MINT) {
            result.swap_direction = "other_token_to_WSOL";
            result.sol_amount_swapped = swapped_in.balance_change;
          }
        }

        return result;
      }

      // If no swap detected, still return the transaction signature
      return {
        tx_signature: transaction.transaction.signatures[0],
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getSwapTransactionsHelius(wallet_address) {
    try {
      const api_key = this.config.HELIUS_API_KEY;
      const base_url = `https://api.helius.xyz/v0/addresses/${wallet_address}/transactions?api-key=${api_key}`;
      let url = base_url;
      let lastSignature = null;
      const allTransactions = []; // Array to store all transactions

      while (true) {
        if (lastSignature) {
          url = base_url + `&before=${lastSignature}`;
        }
        const response = await fetch(url);
        const transactions = await response.json();

        if (transactions && transactions.length > 0) {
          allTransactions.push(...transactions); // Append fetched transactions to the array
          lastSignature = transactions[transactions.length - 1].signature;
          console.log("Getting txs");
        } else {
          console.log("No more transactions available.");
          break;
        }
      }

      return allTransactions; // Return all collected transactions
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async processHeliusUserWalletTxs(wallet_address) {
    try {
      const all_txs = await this.getSwapTransactionsHelius(wallet_address);
      const sol_mint = "So11111111111111111111111111111111111111112";
      let totalBuyCost = 0;
      let totalSellProceeds = 0;

      let swapDescriptions: { [key: string]: string[] } = {};
      all_txs
        .filter((tx) => tx.type === "SWAP" && tx.source === "RAYDIUM")
        .forEach((tx) => {
          const targetMint =
            tx.tokenTransfers[0]?.mint === sol_mint ? tx.tokenTransfers[1]?.mint : tx.tokenTransfers[0]?.mint;

          if (targetMint) {
            // Initialize the array if it doesn't exist
            if (!swapDescriptions[targetMint]) {
              swapDescriptions[targetMint] = [];
            }
            // Push the description to the corresponding mint
            swapDescriptions[targetMint].push(tx.description);
            const solMatch = tx.description.match(/([\d.]+) SOL/);
            const tokenMatch = tx.description.match(/([\d.]+) F9Vv9nbLewHjXkzCBCdiFg14FkDVoEXaY6dWQkhapump/);

            const solAmount = solMatch ? parseFloat(solMatch[1]) : 0;
            const tokenAmount = tokenMatch ? parseFloat(tokenMatch[1]) : 0;

            if (tx.description.includes("for SOL")) {
              // This is a sell (getting SOL for tokens)
              totalSellProceeds += solAmount;
            } else {
              // This is a buy (spending SOL for tokens)
              totalBuyCost += solAmount;
            }
          }
        });

      const pnl = totalSellProceeds - totalBuyCost;

      return { pnl, swapDescriptions };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getUserWalletPortfolio(wallet_address) {
    try {
      const user_txs = await this.getSwapTransactionsHelius(wallet_address);
      const total_txs = user_txs.length;
      let radium_swaps = 0;
      let jupyter_swaps = 0;
      let transfer = 0;
      let unknown = 0;

      user_txs.forEach((tx) => {
        switch (tx?.source) {
          case "RAYDIUM":
            radium_swaps += 1;
            break;
          case "JUPYTER":
            jupyter_swaps += 1;
            break;
          case "SYSTEM_PROGRAM":
            transfer += 1;
            break;
          case "UNKNOWN":
            unknown += 1;
            break;
        }
      });

      console.log(total_txs, radium_swaps);
      return {
        total_txs,
        radium_swaps,
        jupyter_swaps,
        transfer,
        unknown,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  saveToJson(data, filename = this.tokenLiquidityLogsPath) {
    let existingData = [];

    // Check if the file exists
    if (fs.existsSync(filename)) {
      // Read the existing data
      const fileContent = fs.readFileSync(filename, "utf8");
      existingData = JSON.parse(fileContent);
    }

    // Add the new data as a new object in the array
    existingData.push({
      checkedAt: new Date(),
      tokenMintAddress: data.tokenMintAddress,
      totalHoldings: data.totalHoldings,
      holders: data.holders,
    });

    // Write the updated data back to the file
    fs.writeFileSync(filename, JSON.stringify(existingData, null, 2), "utf8");
  }

  // Function to append each transaction detail to a file
  private appendTransactionToFile(transactionData: {
    signature: string;
    blockTime: number | null;
    blockNumber: number;
    signer: string;
    programId: string;
    isRaydium: boolean;
  }) {
    const dataLine = `Signature: ${transactionData.signature},
    Block Time: ${transactionData.blockTime},
    Block Number: ${transactionData.blockNumber},
    Program Id : ${transactionData.programId},
    Signer: ${transactionData.signer}
    Raydium Interaction: ${transactionData.isRaydium ? "Yes" : "No"}\n`;

    // Append to the file with encoding options specified
    fs.appendFile("transactions.txt", dataLine, { encoding: "utf8", flag: "a" }, (err) => {
      if (err) {
        console.error("Failed to write transaction to file:", err);
      } else {
        console.log("Transaction appended to file:", dataLine);
      }
    });
  }
}
