import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";
import { SessionJob } from "./session.jobs";

@Module({
    imports: [PrismaModule],
    controllers: [SessionController],
    providers: [SessionService, SessionJob],
    exports: [SessionJob]
})
export class SessionModule{}