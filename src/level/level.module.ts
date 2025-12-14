import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { LevelController } from "./level.controller";
import { LevelService } from "./level.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [LevelController],
    providers: [LevelService]
})
export class LevelModule{}