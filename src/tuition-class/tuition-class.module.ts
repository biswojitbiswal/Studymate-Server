import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TutorClassController } from "./tutor-class.controller";
import { TuitionClassService } from "./tuition-class.service";
import { AdminClassController } from "./admin-class.controller";
import { PublicClassController } from "./public-class.controller";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";
import { TuitionClassJob } from "./tuition-class.jobs";
import { NotificationModule } from "notification/notification.module";

@Module({
    imports: [PrismaModule, CloudinaryModule, NotificationModule],
    controllers: [TutorClassController, AdminClassController, PublicClassController],
    providers: [TuitionClassService, TuitionClassJob],
    exports: [TuitionClassJob]
})
export class TuitionClassModule{}