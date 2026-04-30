import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { LedgerSource, LedgerStatus, LedgerType, WithdrawalMethod } from "common/enums/payout.enum";

export class CreateLedgerDto{
    @IsString()
    @IsNotEmpty()
    tutorId!: string

    // @IsInt()
    @IsNotEmpty()
    amount!: number

    @IsString()
    @IsNotEmpty()
    referenceId!: string
}


export class WithdrawDto {
    @IsInt()
    @IsNotEmpty()
    amount!: number

    @IsEnum(WithdrawalMethod)
    @IsNotEmpty()
    method!: WithdrawalMethod

    @IsString()
    @IsOptional()
    accountName?: string

    @IsString()
    @IsOptional()
    accountNumber?: string

    @IsString()
    @IsOptional()
    ifsc?: string

    @IsString()
    @IsOptional()
    upiId?: string
}