import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TutorController } from "./tutor.controller";
import { TutorService } from "./tutor.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [TutorController],
    providers: [TutorService]
})
export class TutorModule{}