/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable prefer-const */
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import Web3 from 'web3';
// import Common from '@ethereumjs/common'; //NEW ADDITION
import { ConfigService } from '../../../config/config.service';
import { TwofaService } from '../2fa/2fa.service';
import Moralis from 'moralis';
import axios from 'axios';
const { SolNetwork } = require('@moralisweb3/common-sol-utils');
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  SendOptions,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  LiquidityPoolJsonInfo,
  TokenAccount,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT,
  Market,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  SPL_MINT_LAYOUT,
  ApiPoolInfoV4,
  InnerSimpleV0Transaction,
  LOOKUP_TABLE_CACHE,
  buildSimpleTransaction,
  DEVNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { BN, Wallet } from '@coral-xyz/anchor';
import * as bs58 from 'bs58';
import { any, assert } from 'joi';
import { TokenListProvider, TokenInfo, ENV } from '@solana/spl-token-registry';
import { OpenOrders } from '@project-serum/serum';
import { Metaplex, Model } from '@metaplex-foundation/js';
import {
  AMM_STABLE,
  AMM_V4,
  ApiV3PoolInfoStandardItem,
  Raydium,
  fetchMultipleInfo,
  TxVersion,
} from '@raydium-io/raydium-sdk-v2';
import { InjectModel } from '@nestjs/mongoose';
import { TokenEntity, TokenDocument } from './entity/token.entity';
import { Model as MongooseModel } from 'mongoose';
import { Web3Service } from './web3.service';
import { sha256 } from 'js-sha256';

interface MetadataResponse {
  name: string;
  symbol: string;
  uri: string;
}

type WalletTokenAccounts = Awaited<ReturnType<typeof any>>;
type TestTxInputInfo = {
  outputToken: Token;
  targetPool: string;
  inputTokenAmount: TokenAmount;
  slippage: Percent;
  walletTokenAccounts: WalletTokenAccounts;
  wallet: Keypair;
};
@Injectable()
export class RadiumService {
  private readonly logger = new Logger(RadiumService.name);
  LIQUIDITY_POOLS_JSON_URL =
    'https://api.raydium.io/v2/sdk/liquidity/mainnet.json';
  executeSwap = false;
  useVersionedTransaction = true;
  maxLamports = 100000;
  direction = 'in' as 'in' | 'out';
  liquidityFile = 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json';
  maxRetries = 20;
  allPoolKeysJson: LiquidityPoolJsonInfo[];
  connection: Connection;
  wallet: Wallet;
  makeTxVersion = TxVersion.V0; // LEGACY
  addLookupTableInfo = LOOKUP_TABLE_CACHE; // only mainnet. other = undefined
  OPENBOOK_PROGRAM_ID = new PublicKey(
    'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
  );
  txVersion = TxVersion.V0;
  raydium: Raydium | undefined;

  constructor(
    @InjectModel(TokenEntity.name)
    private readonly tokenModel: MongooseModel<TokenDocument>,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => Web3Service))
    private readonly web3Service: Web3Service,
  ) {
    this.connection = new Connection(this.config.RPC_URL, {
      commitment: 'confirmed',
    });
    this.wallet = new Wallet(
      Keypair.fromSecretKey(
        Uint8Array.from(bs58.decode(this.config.WALLET_PRIVATE_KEY)),
      ),
    );
  }


  async getOwnerTokenAccounts() {
    const walletTokenAccount = await this.connection.getTokenAccountsByOwner(
      this.wallet.publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      },
    );

    return walletTokenAccount.value.map((i) => ({
      pubkey: i.pubkey,
      programId: i.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
  }

  getTokenAccountByOwnerAndMint(mint: PublicKey) {
    return {
      programId: TOKEN_PROGRAM_ID,
      pubkey: PublicKey.default,
      accountInfo: {
        mint: mint,
        amount: 0,
      },
    } as unknown as TokenAccount;
  }

  async calcAmountOut(
    poolKeys: LiquidityPoolKeys,
    rawAmountIn: number,
    swapInDirection: boolean,
  ) {
    try {
      const poolInfo = await Liquidity.fetchInfo({
        connection: this.connection,
        poolKeys,
      });

      let currencyInMint = poolKeys.baseMint;
      let currencyInDecimals = poolInfo.baseDecimals;
      let currencyOutMint = poolKeys.quoteMint;
      let currencyOutDecimals = poolInfo.quoteDecimals;

      if (!swapInDirection) {
        currencyInMint = poolKeys.quoteMint;
        currencyInDecimals = poolInfo.quoteDecimals;
        currencyOutMint = poolKeys.baseMint;
        currencyOutDecimals = poolInfo.baseDecimals;
      }

      const currencyIn = new Token(
        TOKEN_PROGRAM_ID,
        currencyInMint,
        currencyInDecimals,
      );
      const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
      const currencyOut = new Token(
        TOKEN_PROGRAM_ID,
        currencyOutMint,
        currencyOutDecimals,
      );
      const slippage = new Percent(5, 100); // 5% slippage

      const {
        amountOut,
        minAmountOut,
        currentPrice,
        executionPrice,
        priceImpact,
        fee,
      } = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn,
        currencyOut,
        slippage,
      });

      return {
        amountIn,
        amountOut,
        minAmountOut,
        currentPrice,
        executionPrice,
        priceImpact,
        fee,
      };
    } catch (error) {
      console.log('Failed to calculate amount out');
      return;
      // throw new Error('Failed to calculate amount out');
    }
  }

  async formatAmmKeysById(id: string): Promise<ApiPoolInfoV4> {
    const account = await this.connection.getAccountInfo(new PublicKey(id));
    if (account === null) throw Error(' get id info error ');
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

    const marketId = info.marketId;
    const marketAccount = await this.connection.getAccountInfo(marketId);
    if (marketAccount === null) throw Error(' get market info error');
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

    const lpMint = info.lpMint;
    const lpMintAccount = await this.connection.getAccountInfo(lpMint);
    if (lpMintAccount === null) throw Error(' get lp mint info error');
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

    return {
      id,
      baseMint: info.baseMint.toString(),
      quoteMint: info.quoteMint.toString(),
      lpMint: info.lpMint.toString(),
      baseDecimals: info.baseDecimal.toNumber(),
      quoteDecimals: info.quoteDecimal.toNumber(),
      lpDecimals: lpMintInfo.decimals,
      version: 4,
      programId: account.owner.toString(),
      authority: Liquidity.getAssociatedAuthority({
        programId: account.owner,
      }).publicKey.toString(),
      openOrders: info.openOrders.toString(),
      targetOrders: info.targetOrders.toString(),
      baseVault: info.baseVault.toString(),
      quoteVault: info.quoteVault.toString(),
      withdrawQueue: info.withdrawQueue.toString(),
      lpVault: info.lpVault.toString(),
      marketVersion: 3,
      marketProgramId: info.marketProgramId.toString(),
      marketId: info.marketId.toString(),
      marketAuthority: Market.getAssociatedAuthority({
        programId: info.marketProgramId,
        marketId: info.marketId,
      }).publicKey.toString(),
      marketBaseVault: marketInfo.baseVault.toString(),
      marketQuoteVault: marketInfo.quoteVault.toString(),
      marketBids: marketInfo.bids.toString(),
      marketAsks: marketInfo.asks.toString(),
      marketEventQueue: marketInfo.eventQueue.toString(),
      lookupTableAccount: PublicKey.default.toString(),
    };
  }

  async getLiquidity(poolKeys, tokenMintAddress) {
    // Fetch the account information for both the base and quote vaults
    const baseVaultAccount = await this.connection.getAccountInfo(
      new PublicKey(poolKeys.baseVault),
    );
    const quoteVaultAccount = await this.connection.getAccountInfo(
      new PublicKey(poolKeys.quoteVault),
    );

    if (baseVaultAccount === null || quoteVaultAccount === null) {
      throw Error('Error fetching vault account information');
    }

    // Decode the account data using the appropriate layout to get the balance
    const baseBalance = baseVaultAccount.lamports / LAMPORTS_PER_SOL; // Assuming direct SOL balance for simplicity
    const quoteBalance = quoteVaultAccount.lamports / LAMPORTS_PER_SOL; // For SPL tokens, you might need additional decoding based on the SPL token layout
    const basepriceinsol = quoteBalance / baseBalance;
    const basepriceinusd = basepriceinsol * 143;
    const valueUSDbaseBalance = baseBalance * basepriceinusd;
    const valueUSDquoteBalace = quoteBalance * 143;
    const liquidityAvailable = valueUSDbaseBalance + valueUSDquoteBalace;

    return {
      baseBalance,
      quoteBalance,
      liquidityAvailable,
    };
  }

  convertLamportsToSol(lamports) {
    return lamports / 1_000_000_000; // 1 SOL = 1,000,000,000 lamports
  }

  convertSolToLamports(sol) {
    return sol * 1_000_000_000; // 1 SOL = 1,000,000,000 lamports
  }

  async getTokenDetailsFromSPLRegistry(token: string) {
    // Fetch token metadata from the SPL Token Registry
    const tokenListProvider = new TokenListProvider();
    const tokens = await tokenListProvider.resolve();
    const tokenList = tokens.filterByChainId(ENV.MainnetBeta).getList();

    // Create a map of token addresses to token info
    const tokenMap = tokenList.reduce((map, item) => {
      map.set(item.address, item);
      return map;
    }, new Map<string, TokenInfo>());

    // Get token info from the SPL Token Registry
    const tokenInfo = tokenMap.get(token);
    if (tokenInfo) {
      console.log('Token Details');
      console.log('Token Address: ' + tokenInfo.address);
      console.log('Token ChainId: ' + tokenInfo.chainId);
      console.log('Token Symbol: ' + tokenInfo.symbol);
      console.log('Token Name: ' + tokenInfo.name);
      console.log('Token Decimals: ' + tokenInfo.decimals);

      return {
        chainId: tokenInfo.chainId,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        decimals: tokenInfo.decimals,
      };
    } else {
      console.log('Token Info not found in SPL Token Registry');
    }
  }

  async getTokenMetadataFromMetaplex(token: string) {
    try {
      let mint: any = await this.connection.getParsedAccountInfo(
        new PublicKey(token),
      );
      const metaplex = Metaplex.make(this.connection);
      const mintAddress = new PublicKey(token);
      const metadataAccount = metaplex
        .nfts()
        .pdas()
        .metadata({ mint: mintAddress });

      const metadataAccountInfo = await this.connection.getAccountInfo(
        metadataAccount,
      );

      if (metadataAccountInfo) {
        const token = await metaplex
          .nfts()
          .findByMint({ mintAddress: mintAddress });

        console.log('Token Details');
        console.log('Token Address: ' + token.address);
        console.log('Token Symbol: ' + token.symbol);
        console.log('Token Name: ' + token.name);
        console.log('Token Decimals: ' + mint.value.data.parsed.info.decimals);

        return {
          tokenName: token.name,
          tokenSymbol: token.symbol,
          decimals: mint.value.data.parsed.info.decimals,
        };
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async getTokenAccounts(owner: PublicKey) {
    const tokenResp = await this.connection.getTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    });

    const accounts: TokenAccount[] = [];
    for (const { pubkey, account } of tokenResp.value) {
      accounts.push({
        programId: TOKEN_PROGRAM_ID,
        pubkey,
        accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
      });
    }

    return accounts;
  }

  async parsePoolInfo(token: string, poolId: string) {
    try {
      const owner = new PublicKey(token);
      const tokenAccounts = await this.getTokenAccounts(owner);

      // Example to get pool info
      const info = await this.connection.getAccountInfo(new PublicKey(poolId));
      if (!info) return;

      const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
      const openOrders = await OpenOrders.load(
        this.connection,
        poolState.openOrders,
        this.OPENBOOK_PROGRAM_ID, // OPENBOOK_PROGRAM_ID(marketProgramId) of each pool can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
      );

      const baseDecimal = 10 ** poolState.baseDecimal.toNumber(); // e.g. 10 ^ 6
      const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();

      const baseTokenAmount = await this.connection.getTokenAccountBalance(
        poolState.baseVault,
      );
      const quoteTokenAmount = await this.connection.getTokenAccountBalance(
        poolState.quoteVault,
      );

      const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
      const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;

      const openOrdersBaseTokenTotal =
        openOrders.baseTokenTotal.toNumber() / baseDecimal;
      const openOrdersQuoteTokenTotal =
        openOrders.quoteTokenTotal.toNumber() / quoteDecimal;

      const base =
        (baseTokenAmount.value?.uiAmount || 0) +
        openOrdersBaseTokenTotal -
        basePnl;
      const quote =
        (quoteTokenAmount.value?.uiAmount || 0) +
        openOrdersQuoteTokenTotal -
        quotePnl;

      const denominator = new BN(10).pow(poolState.baseDecimal);

      const addedLpAccount = tokenAccounts.find((a) =>
        a.accountInfo.mint.equals(poolState.lpMint),
      );

      const adjustedBaseTokenAmount = base;
      const adjustedQuoteTokenAmount = quote;

      // Calculate the price of the base token in terms of the quote token
      const baseTokenPrice = adjustedBaseTokenAmount / adjustedQuoteTokenAmount;

      const lpWorhtInSol =
        (baseTokenAmount.value.uiAmount / quoteTokenAmount.value.uiAmount) *
        Number(poolState.lpReserve.div(denominator).toString());

      console.log(
        'Price of the base token in terms of the quote token: ' +
          baseTokenPrice.toFixed(6),
      );

      console.log('lpWorhtInSol ', lpWorhtInSol * 143);

      console.log(
        '\npool total base ' + base,
        '\npool total quote ' + quote,
        '\nbase vault balance ' + baseTokenAmount.value.uiAmount,
        '\nquote vault balance ' + quoteTokenAmount.value.uiAmount,
        '\nbase tokens in openorders ' + openOrdersBaseTokenTotal,
        '\nquote tokens in openorders ' + openOrdersQuoteTokenTotal,
        '\ntotal lp ' + poolState.lpReserve.div(denominator).toString(),
        '\naddedLpAmount ' +
          (addedLpAccount?.accountInfo.amount.toNumber() || 0) / baseDecimal,
      );

      // return baseTokenPrice.toFixed(6);
      return;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getTokenBalance(vault: PublicKey, decimals: number): Promise<number> {
    const balance = await this.connection.getTokenAccountBalance(vault);
    return parseFloat(balance.value.amount) / Math.pow(10, decimals); // Adjust the balance for the token's decimals
  }

  calculateSolPercentage(solAmount, solValueInUnits) {
    return (solAmount * solValueInUnits).toFixed(6);
  }

  async getTheTokenPrice(
    tokenMintAddress: string,
    solanaAddress: string,
    lpPairAddress: string,
    buyAmount: number,
  ) {
    try {
      const targetPoolInfo = await this.formatAmmKeysById(lpPairAddress);
      // console.log(targetPoolInfo);
      // console.log('-------------------------');
      const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;
      const directionIn = poolKeys.quoteMint.toString() == tokenMintAddress;

      // Get the liquidity information
      const { liquidityAvailable } = await this.getLiquidity(
        poolKeys,
        tokenMintAddress,
      );

      // console.log(`Loaded pool keys`);
      const { amountOut, minAmountOut } = await this.calcAmountOutithRetry(
        poolKeys,
        buyAmount,
        directionIn,
      );
      return {
        amountOut: amountOut.toFixed(),
        minAmountOut: minAmountOut.toFixed(),
        liquidityAvailable,
      };
    } catch (error) {
      console.log('Some Error on calculateAmountOut in getTheTokenPrice');
      throw new Error('Some Error on calculateAmountOut in getTheTokenPrice');
    }
  }

  async getTheSolPrice(
    tokenMintAddress: string,
    solanaAddress: string,
    lpPairAddress: string,
    buyAmount: number,
  ) {
    try {
      const targetPoolInfo = await this.formatAmmKeysById(lpPairAddress);
      // console.log(targetPoolInfo);
      // console.log('-------------------------');
      const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;
      const directionIn = poolKeys.quoteMint.toString() == solanaAddress;
      // console.log(`Loaded pool keys`);
      const { amountOut, minAmountOut } = await this.calcAmountOutithRetry(
        poolKeys,
        buyAmount,
        directionIn,
      );
      return {
        amountOut: amountOut.toFixed(),
        minAmountOut: minAmountOut.toFixed(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async calcAmountOutithRetry(
    poolKeys: any,
    rawAmountIn: any,
    swapInDirection: any,
    attempts: number = 3,
  ) {
    try {
      const { amountOut, minAmountOut, amountIn } = await this.calcAmountOut(
        poolKeys,
        rawAmountIn,
        swapInDirection,
      );

      return { amountOut, minAmountOut, amountIn };
    } catch (error) {
      if (attempts > 0) {
        console.log(
          `Attempt to calculate amount failed, ${attempts} retries left. Error: ${error.message}`,
        );
        return this.calcAmountOutithRetry(
          poolKeys,
          rawAmountIn,
          swapInDirection,
          attempts - 1,
        );
      } else {
        throw new Error(
          'Failed to sell token after several attempts: ' + error.message,
        );
      }
    }
  }
}
