import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { LanguageController } from "./language.controller";
import { LanguageService } from "./language.service";

@Module({
    imports: [PrismaModule],
    controllers: [LanguageController],
    providers: [LanguageService]
})
export class BoardModule{}