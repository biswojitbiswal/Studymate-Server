import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { ResourceController } from "./resources.controller";
import { ResourceService } from "./resources.service";
import { CloudinaryModule } from "cloudinary/cloudinary.module";

@Module({
    imports: [PrismaModule, CloudinaryModule],
    controllers: [ResourceController],
    providers: [ResourceService]
})
export class ResourceModule{}