import { Body, Controller, Post, Query } from "@nestjs/common";
import { LedgerService } from "./ledger.service";
import { Public } from "common/decorator/public.decorator";
import { CreateLedgerDto } from "./dtos/ledger.dto";

@Controller({
    path: 'ledger',
    version: '1'
})
export class LedgerController{
    constructor(private readonly ledger: LedgerService){}


}