import { PriceOn } from "@prisma/client"
import { Type } from "class-transformer"
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator"
import { OrderStatus, ProductType } from "common/enums/order.enum"

export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    productId: string

    @IsString()
    @IsEnum(PriceOn)
    itemType: PriceOn

    @IsString()
    @IsOptional()
    couponCode?: string
}



export class OrderFilterDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsOptional()
    @IsEnum(ProductType)
    productType?: ProductType;
}



export class AdminOrderFilterDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsOptional()
    @IsEnum(ProductType)
    productType?: ProductType;

    @IsOptional()
    from?: Date;

    @IsOptional()
    to?: Date;
}
