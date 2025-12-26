import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class SessionService {
    constructor(private readonly prisma: PrismaService) { }

//     TutorAvailability
//     TutorTimeOff
//     TutorLeave
//     Existing Sessions
}