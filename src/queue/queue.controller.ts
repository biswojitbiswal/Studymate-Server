import { Controller, Get } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { Public } from "common/decorator/public.decorator";

@Controller({
    path: 'queue',
    version: '1'
})
export class QueueController {
    constructor(private readonly queueService: QueueService) { }


    // @Public()
    // @Get('add')
    // async addJob() {
    //     await this.queueService.addEmailJob({
    //         email: 'biswojitb474@gmail.com',
    //         subject: "Sending email for job queue testing",
    //         text: 'Fallback text version',
    //         html: `<h1>Send grid Email testing with job queue</h1>`,
    //     });


    //     return { message: 'Jobs added 🚀' };
    // }
}