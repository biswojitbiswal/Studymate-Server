import { Controller, Get, Param, Query } from "@nestjs/common";
import { TuitionClassService } from "./tuition-class.service";
import { BrowseClassFilterDto } from "./dtos/tuition-class.dto";
import { Public } from "src/common/decorator/public.decorator";

@Controller({
    path: "public/classes",
    version: "1"
})
export class PublicClassController {
    constructor(private readonly classservice: TuitionClassService) { }

    // 7️⃣ Browse classes
    @Public()
    @Get('browse')
    async browse(@Query() dto: BrowseClassFilterDto) {
        return await this.classservice.browse(dto);
    }

    // // 8️⃣ Get public class by id
    @Public()
    @Get(':classId')
    async getPublicById(@Param('classId') classId: string) {
        return await this.classservice.getPublicById(classId);
    }
}
