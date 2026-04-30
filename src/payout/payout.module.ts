import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { LedgerController } from "./ledger.controller";
import { WalletController } from "./wallet.controller";
import { LedgerService } from "./ledger.service";
import { WalletService } from "./wallet.service";

@Module({
    imports: [PrismaModule],
    controllers: [LedgerController, WalletController],
    providers: [LedgerService, WalletService],
    exports: [LedgerService, WalletService]
})
export class PayoutModule{}