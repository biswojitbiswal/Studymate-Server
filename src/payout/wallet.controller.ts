import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { AuthGuard } from "common/guards/auth.guard";
import { Roles } from "common/decorator/roles.decorator";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { WithdrawDto } from "./dtos/ledger.dto";
import { PaginationDto } from "common/dtos/pagination.dto";

@Controller({
    path: 'wallet',
    version: '1'
})
export class WalletController{
    constructor(private readonly wallet: WalletService){}


    @UseGuards(AuthGuard)
    @Roles('TUTOR')
    @Post('withdrawls')
    async withdraw(@GetCurrentUserId() userId: string, @Body() dto: WithdrawDto){
        return await this.wallet.withdraw(userId, dto)
    }


    @UseGuards(AuthGuard)
    @Roles('TUTOR')
    @Get('withdrawls')
    async getWithdraw(@GetCurrentUserId() userId: string, @Query() dto: PaginationDto){
        return await this.wallet.getWithdraw(userId, dto)
    }


    @UseGuards(AuthGuard)
    @Roles('ADMIN')
    @Get('admin/withdrawls')
    async getAll(@Query() dto: PaginationDto){
        return await this.wallet.getAll(dto)
    }

}