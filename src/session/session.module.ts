import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";
import { SessionJob } from "./session.jobs";
import { MeetingModule } from "src/meeting/meeting.module";

@Module({
    imports: [PrismaModule, MeetingModule],
    controllers: [SessionController],
    providers: [SessionService, SessionJob],
    exports: [SessionJob]
})
export class SessionModule{}