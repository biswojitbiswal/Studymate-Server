import { Controller, Get } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { Public } from "common/decorator/public.decorator";

@Controller({
    path: 'queue',
    version: '1'
})
export class QueueController {
    constructor(private readonly queueService: QueueService) { }


}