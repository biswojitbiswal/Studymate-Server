import { Controller } from "@nestjs/common";
import { SubjectService } from "./subject.service";

@Controller({
    path: 'subject',
    version: '1'
})
export class SubjectController{
    constructor(private readonly subject: SubjectService){}
}