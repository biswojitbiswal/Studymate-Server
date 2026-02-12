import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ClassEnrollmentController } from "./class-enrollment.controller";
import { ClassEnrollmentService } from "./class-enrollment.service";

@Module({
    imports: [PrismaModule],
    controllers: [ClassEnrollmentController],
    providers: [ClassEnrollmentService],
    exports: [ClassEnrollmentService]
})
export class ClassEnrollmentModule{}