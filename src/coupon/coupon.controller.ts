import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CouponService } from "./coupon.service";
import { CouponFilterDto, CouponValidateDto, CreateCouponDto, UpdateCouponDto } from "./dtos/coupon.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";

@Controller({
    path: 'coupon',
    version: '1',
})
export class CouponController {
    constructor(private readonly coupon: CouponService) { }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post()
    async create(@Body() dto: CreateCouponDto) {
        return await this.coupon.create(dto)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    async getAll(@Query() dto: PaginationDto) {
        return await this.coupon.getAll(dto)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT')
    @Get('checkout')
    async getCouponForCheckout(@GetCurrentUserId() userId: string, @Query() dto: CouponFilterDto) {
        return await this.coupon.getCouponForCheckout(userId, dto)
    }



    @UseGuards(AuthGuard, RolesGuard)
    @Roles("STUDENT")
    @Post('validate')
    async couponValidate(@Body() dto: CouponValidateDto, @GetCurrentUserId() userId: string) {
        return await this.coupon.couponValidate(dto, userId);
    }



    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get(':id')
    async getByID(@Param('id') id: string) {
        return await this.coupon.getByID(id)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id')
    async delete(@Param('id') id: string) {
        return await this.coupon.delete(id)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id')
    async update(@Param('id') id: string, @Body('payload') dto: UpdateCouponDto, @Req() req: any,) {
        console.log("RAW BODY:", req.body);
        console.log("DTO:", dto);
        return await this.coupon.update(id, dto)
    }

}