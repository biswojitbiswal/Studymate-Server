import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { PriceOn, PriceType } from 'src/common/enums/price.enum';
import { Status } from 'src/common/enums/tuition-class.enum';

export class CreateCouponDto {
  @IsString()
  @Transform(({ value }) => value.trim().toUpperCase())
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PriceType)
  discountType: PriceType;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsEnum(PriceOn)
  appliesTo: PriceOn;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) { }


export class CouponFilterDto {
  @IsString()
  @IsNotEmpty()
  productId: string

  @IsString()
  @IsEnum(PriceOn)
  itemType: PriceOn
}


export class CouponValidateDto {
  @IsString()
  @IsNotEmpty()
  couponCode: string

  @IsString()
  @IsNotEmpty()
  productId: string

  @IsString()
  @IsEnum(PriceOn)
  itemType: PriceOn
}


