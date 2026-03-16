import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { ReviewController } from "./review.contoller";
import { ReviewService } from "./review.service";

@Module({
    imports: [PrismaModule],
    controllers: [ReviewController],
    providers: [ReviewService]
})
export class ReviewModule{}