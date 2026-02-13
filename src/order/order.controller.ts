import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { OrderService } from "./order.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { CreateOrderDto } from "./dtos/order.dto";

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

    @UseGuards(AuthGuard)
    @Get("checkout/:classId")
    async checkout(@GetCurrentUserId() userId: string, @Param('classId') classId: string){
        return await this.orderService.checkout(classId, userId);
    }
}