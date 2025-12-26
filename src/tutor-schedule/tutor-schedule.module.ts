import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TutorScheduleController } from "./tutor-schedule.controller";
import { TutorAvailibilityService } from "./tutor-availibility.service";
import { TutorTimeoffService } from "./tutor-timeoff.service";
import { TutorLeaveService } from "./tutor-leave.service";

@Module({
    imports: [PrismaModule],
    controllers: [TutorScheduleController],
    providers: [TutorAvailibilityService, TutorTimeoffService, TutorLeaveService]
})
export class TutorScheduleModule{}