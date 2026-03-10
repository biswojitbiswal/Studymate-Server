import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { AssignmentController } from "./assignment.controller";
import { AssignmentService } from "./assignment.service";

@Module({
    imports: [PrismaModule],
    controllers: [AssignmentController],
    providers: [AssignmentService]
})
export class AssignmentModule{}