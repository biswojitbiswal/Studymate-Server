import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { WishlistService } from "./wishlist.service";
import { AuthGuard } from "common/guards/auth.guard";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { PaginationDto } from "common/dtos/pagination.dto";
import { Public } from "common/decorator/public.decorator";
import { OptionalJwtAuthGuard } from "common/guards/optionaljwt.guard";


@Controller({
    path: "wishlists",
    version: '1'
})
export class WishlistController{
    constructor(private readonly wishlistService: WishlistService){}


    @UseGuards(AuthGuard)
    @Get()
    async getMyFavorites(@GetCurrentUserId() userId: string, @Query() dto: PaginationDto){
        console.log(userId);
        
        return await this.wishlistService.getMyWishlists(userId, dto)
    }


    // @Public()
    @UseGuards(AuthGuard)
    @Post(':id/toggle')
    async toggle(@Param('id') id: string, @GetCurrentUserId() userId: string){
        return await this.wishlistService.toggle(id, userId)
    }
}