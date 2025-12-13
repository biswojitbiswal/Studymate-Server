import { Controller } from "@nestjs/common";
import { LevelService } from "./level.service";

@Controller({
    path: 'level',
    version: '1'
})
export class LevelController{
    constructor(private readonly level: LevelService){}
}