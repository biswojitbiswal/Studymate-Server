import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";
import { PriceOn, PriceType } from "src/common/enums/price.enum";
import { Status } from "src/common/enums/tuition-class.enum";


export class CreateCommissionDto {
  @IsEnum(PriceType)
  type: PriceType;

  @IsEnum(PriceOn)
  appliesTo: PriceOn;


  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsEnum(Status)
  @IsOptional()
  status?: Status
}

export class UpdateCommissionDto {

  @IsEnum(PriceType)
  @IsOptional()
  priceType?: PriceType;


  @IsEnum(PriceOn)
  @IsOptional()
  appliesTo?: PriceOn;


  @Transform(({ value }) => (value === undefined ? undefined : parseFloat(value)))
  @IsNumber()
  @IsOptional()
  value?: number;

  @IsEnum(Status)
  @IsOptional()
  status?: Status
}
