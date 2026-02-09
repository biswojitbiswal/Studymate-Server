import { PriceOn } from "@prisma/client"
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator"

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