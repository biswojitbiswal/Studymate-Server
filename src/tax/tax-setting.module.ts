import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TaxSettingController } from "./tax-setting.controller";
import { TaxSettingService } from "./tax-setting.service";

@Module({
    imports: [PrismaModule],
    controllers: [TaxSettingController],
    providers: [TaxSettingService]
})
export class TaxSettingModule{}