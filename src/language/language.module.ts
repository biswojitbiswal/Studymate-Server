import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { LanguageController } from "./language.controller";
import { LanguageService } from "./language.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [LanguageController],
    providers: [LanguageService]
})
export class LanguageModule{}