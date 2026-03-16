import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ReviewService } from "./review.service";
import { AuthGuard } from "common/guards/auth.guard";
import { RolesGuard } from "common/guards/roles.guard";
import { Roles } from "common/decorator/roles.decorator";
import { ReviewDto, ReviewFilterDto, ReviewStatusDto } from "./dtos/review.dto";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { Public } from "common/decorator/public.decorator";

@Controller({
    path: "reviews",
    version: '1'
})
export class ReviewController{
    constructor(private readonly reviewService: ReviewService){}


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUENT')
    @Post()
    async create(@Body() dto: ReviewDto, @GetCurrentUserId() userId: string){
        return await this.reviewService.create(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    async getAll(@Query() dto: ReviewFilterDto){
        return await this.reviewService.getAll(dto)
    }


    @Public()
    @Get()
    async getBrowse(@Query() dto: ReviewFilterDto){
        return await this.reviewService.getBrowse(dto)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id')
    async statusUpdate(@Param('id') id: string, @Body() dto: ReviewStatusDto){
        return await this.reviewService.statusUpdate(id, dto)
    }
}