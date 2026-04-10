import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./dtos/jwt.strategy";
import { EmailModule } from "src/mail/mail.module";
import { CloudinaryModule } from "cloudinary/cloudinary.module";

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'supersecretkey',
            signOptions: { expiresIn: '7d' }, // token expiry 
        }),
        PrismaModule,
        EmailModule,
        CloudinaryModule
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy]
})
export class AuthModule { }