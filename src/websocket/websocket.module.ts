import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { WebsocketGateway } from "./websocket.gateway";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "auth/dtos/jwt.strategy";

@Module({
    imports: [
        JwtModule.register({
                    secret: process.env.JWT_SECRET || 'supersecretkey',
                    signOptions: { expiresIn: '7d' }, // token expiry 
                }),
        PrismaModule],
    providers: [WebsocketGateway, JwtStrategy],
    exports: [WebsocketGateway]
})
export class WebsocketModule{}