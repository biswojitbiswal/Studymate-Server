import { Controller } from "@nestjs/common";
import { LanguageService } from "./language.service";

@Controller({
    path: 'language',
    version: '1'
})
export class LanguageController{
    constructor(private readonly Language: LanguageService){}
}