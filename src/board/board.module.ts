import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BoardController } from "./board.controller";
import { BoardService } from "./board.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [BoardController],
    providers: [BoardService]
})
export class BoardModule{}