import { MasterWalletDto } from "./dto/masterWallet.dto";
import { Web3Service } from "./web3.service";
import { ResponseService } from "../../../utils/response/response.service";
import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { Public } from "../../../utils/decorators/public.decorator";
import { swapDto } from "./dto/swap.dto";
import { AdminRoleGuard } from "../auth/guard/roles.guard";
import { publicDecrypt } from "crypto";
import { RadiumService } from "./radium.service";
import { TokenService } from "./token.service";

@Controller("web3")
export class Web3Controller {
  constructor(
    private readonly responseService: ResponseService,
    private readonly web3Service: Web3Service,
    private readonly radiumService: RadiumService,
    private readonly tokenService: TokenService
  ) {}

  @Public()
  @Post("get_token_signature")
  async get_token_signature(@Body() body: any, @Req() req: any, @Query() param: any, @Res() res: Response) {
    try {
      console.log(body);
      console.log(param);

      this.responseService.successResponse(
        true,
        await this.web3Service.getAllTransactionsWithRetry(
          param?.token_address,
          Number(param?.limit),
          param?.last_signature.length > 0 ? param?.last_signature : null
        ),
        res
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("get_sniper_wallets")
  async get_sniper_wallets(@Body() body: any, @Req() req: any, @Query() param: any, @Res() res: Response) {
    try {
      console.log(body);
      console.log(param);

      this.responseService.successResponse(
        true,
        await this.tokenService.getSniperWallets(param?.contract_address, param?.limit),
        res
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("filter_radium_txs")
  async filter_radium_txs(@Body() body: any, @Req() req: any, @Query() param: any, @Res() res: Response) {
    try {
      console.log(body);
      console.log(param);

      this.responseService.successResponse(
        true,
        await this.tokenService.filterRadiumWallets(param?.contract_address),
        res
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("get_tx_detail")
  async get_tx_detail(@Body() body: any, @Req() req: any, @Query() param: any, @Res() res: Response) {
    try {
      console.log(body);
      console.log(param);

      this.responseService.successResponse(true, await this.tokenService.getTransactionDetailsV2(param?.tx_hash), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("get_meme_tokens")
  async sellTokenFromRadium(@Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.tokenService.getTokens(param?.page, param?.limit), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("get_last_signature")
  async getLastSignature(@Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.tokenService.getLastSignature(param?.ca, param?.limit),
        res
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("does_wallet_exists")
  async doesWalletExists(@Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.tokenService.doesWalletExists(param?.wa), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("get_wallet_portfolio")
  async getWalletPortfolio(@Body() body: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.tokenService.getWalletPortfolio(body.wallet_address), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("get_swap_transactions")
  async get_swap_transactions(@Body() body: any, @Req() req: any, @Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.web3Service.getSwapTransactions(param?.wallet_address),
        res
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while sending token.",
        res
      );
    }
  }

  @Public()
  @Post("getTokenOwner")
  async getTokenDetails(@Body() body: any, @Req() req: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.web3Service.getOwnerOfSPLToken(body), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }

  @Public()
  @Post("getTokenHolders")
  async getTokenHolders(@Body() body: any, @Req() req: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.web3Service.getTokenHoldersList(body.address), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }

  @Public()
  @Post("get_swap_tx")
  async getSwapTx(@Body() body: any, @Req() req: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.web3Service.findSwapDetails(body.signature), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }

  @Public()
  @Post("get_swap_transactions_helius")
  async getSwapTransactionsHelius(@Body() body: any, @Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.web3Service.processHeliusUserWalletTxs(param.wallet_address),
        res
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }

  @Public()
  @Post("get_user_portfolio")
  async getUserWalletPortfolio(@Body() body: any, @Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(
        true,
        await this.web3Service.getUserWalletPortfolio(param.wallet_address),
        res
      );
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }

  @Public()
  @Post("get_wallet_greater_than_zero")
  async getWalletGreaterThanZero(@Body() body: any, @Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.tokenService.getWalletGreaterThanZero(), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }

  @Public()
  @Post("get_wallet_swap_transactions_deatail")
  async getWalletSwapTransactionsDetail(@Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.tokenService.getWalletSwapTransactionsDetail(), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }

  @Public()
  @Post("get_wallet_pnl")
  async getWalletPNL(@Query() param: any, @Res() res: Response) {
    try {
      this.responseService.successResponse(true, await this.tokenService.getWalletPNL(), res);
    } catch (error) {
      return this.responseService.serverFailureResponse(
        typeof error.message == "string" ? error.message : "Some error occurred while getting trade analytics.",
        res
      );
    }
  }
}
