import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [StudentController],
    providers: [StudentService]
})
export class StudentModule{}