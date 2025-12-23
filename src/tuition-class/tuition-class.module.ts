import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TutorClassController } from "./tutor-class.controller";
import { TuitionClassService } from "./tuition-class.service";
import { AdminClassController } from "./admin-class.controller";
import { PublicClassController } from "./public-class.controller";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [TutorClassController, AdminClassController, PublicClassController],
    providers: [TuitionClassService]
})
export class TuitionClassModule{}