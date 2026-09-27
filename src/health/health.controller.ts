import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from 'common/decorator/public.decorator';
import { PrismaService } from 'prisma/prisma.service';
import { connection } from '../config/redis.config';

@Public()
@Controller({
    path: 'health',
    version: '1'
})
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly prisma: PrismaService
    ) { }
    @Get('live')
    live() {
        return {
            status: 'ok',
        };
    }


    @Get('ready')
    @HealthCheck()
    ready() {
        return this.health.check([
            async () => {
                await this.prisma.user.findFirst({
                    select: { id: true },
                });

                return {
                    mongodb: {
                        status: 'up',
                    },
                };
            },

            async () => {
                const result = await connection.ping();

                return {
                    redis: {
                        status: result === 'PONG' ? 'up' : 'down',
                    }
                }
            }
        ])
    }
}