import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { CommissionController } from "./commission.controller";
import { CommissionService } from "./commission.service";

@Module({
    imports: [PrismaModule],
    controllers: [CommissionController],
    providers: [CommissionService]
})
export class CommissionModule{}