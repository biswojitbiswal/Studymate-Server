import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TutorController } from "./tutor.controller";
import { TutorService } from "./tutor.service";

@Module({
    imports: [PrismaModule],
    controllers: [TutorController],
    providers: [TutorService]
})
export class TutorModule{}