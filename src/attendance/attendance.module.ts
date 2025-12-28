import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

@Module({
    imports: [PrismaModule],
    controllers: [AttendanceController],
    providers: [AttendanceService]
})
export class AttendanceModule{}