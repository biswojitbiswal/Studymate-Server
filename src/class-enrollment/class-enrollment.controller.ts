import { Controller } from "@nestjs/common";
import { ClassEnrollmentService } from "./class-enrollment.service";

@Controller({
    path: "class-enrollment",
    version: '1'
})
export class ClassEnrollmentController{
    constructor(private readonly enrollmentService: ClassEnrollmentService){}


}