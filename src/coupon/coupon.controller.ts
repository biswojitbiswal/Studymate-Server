import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CouponService } from "./coupon.service";
import { CreateCouponDto, UpdateCouponDto } from "./dtos/coupon.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { PaginationDto } from "src/common/dtos/pagination.dto";

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


    // @UseGuards(AtGaurd)
    // @Get('customer')
    // @Roles(UserRole.CUSTOMER)
    // async getForCustomer(@GetCurrentUserId() userId: string) {
    //     try {
    //         const user = await this.prisma.user.findUnique({
    //             where: { id: userId },
    //             select: {
    //                 id: true,
    //             }
    //         })

    //         if (!user) throw new Notification("User not found");

    //         const customer = await this.prisma.customer.findUnique({
    //             where: { userId: user.id }
    //         })

    //         let coupon;
    //         if (customer) {         
    //             coupon = await this.coupon.getForCustomer(customer.id);
    //         }

    //         if(!coupon) throw new NotFoundException("Invalid or expired coupon")

    //         return coupon;
    //     } catch (error) {
    //         if(error instanceof HttpException) throw error;
    //         throw new InternalServerErrorException("Internal server errror")
    //     }
    // }


    // @UseGuards(AtGaurd)
    // @Get('redeme/:id')
    // @Roles(UserRole.CUSTOMER)
    // async redemeCoupon(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    //     const user = await this.prisma.user.findUnique({
    //         where: { id: userId },
    //         select: {
    //             id: true,
    //         }
    //     })

    //     if (!user) throw new Notification("User not found");

    //     const customer = await this.prisma.customer.findUnique({
    //         where: { userId: user.id }
    //     })

    //     if (!customer) throw new Notification("Customer not found");
    //     return await this.coupon.redemeCoupon(customer.id, id)
    // }



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