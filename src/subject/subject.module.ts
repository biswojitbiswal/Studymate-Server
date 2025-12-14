import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SubjectController } from "./subject.controller";
import { SubjectService } from "./subject.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [SubjectController],
    providers: [SubjectService]
})
export class BoardModule{}