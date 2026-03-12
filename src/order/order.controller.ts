import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { OrderService } from "./order.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { AdminOrderFilterDto, CreateOrderDto, OrderFilterDto } from "./dtos/order.dto";
import { PaginationDto } from "common/dtos/pagination.dto";

@Controller({
    path: 'order',
    version: '1'
})
export class OrderController{
    constructor(private readonly orderService: OrderService){}


    @UseGuards(AuthGuard)
    @Post()
    async create(@GetCurrentUserId() userId: string, @Body() dto: CreateOrderDto){
        return await this.orderService.create(dto, userId);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    async getAll(@Query() dto: AdminOrderFilterDto){
        return await this.orderService.getAll(dto);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT')
    @Get('my')
    async getMyOrders(@Query() dto: OrderFilterDto, @GetCurrentUserId() userId: string){
        return await this.orderService.getMyOrders(dto, userId);
    }

    @UseGuards(AuthGuard)
    @Get("checkout/:classId")
    async checkout(@GetCurrentUserId() userId: string, @Param('classId') classId: string){
        return await this.orderService.checkout(classId, userId);
    }


    @UseGuards(AuthGuard)
    @Get(":orderId/status")
    async getStatus(@Param('orderId') orderId: string){
        return await this.orderService.getStatus(orderId)
    }


    @UseGuards(AuthGuard)
    @Get(":orderId")
    async getById(@Param('orderId') orderId: string, @GetCurrentUserId() userId: string){
        return await this.orderService.getById(orderId, userId)
    }
}