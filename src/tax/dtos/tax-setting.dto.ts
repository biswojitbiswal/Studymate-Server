import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Status } from "@prisma/client";

export class CreateTaxSettingDto {

  @IsString()
  @IsNotEmpty()
  name: string;


  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsNotEmpty()
  value: number;


  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}

export class UpdateTaxSettingDto {
  @IsString()
  @IsOptional()
  name?: string;


  @Transform(({ value }) =>
    value === undefined ? undefined : parseFloat(value)
  )
  @IsNumber()
  @IsOptional()
  value?: number;


  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}
