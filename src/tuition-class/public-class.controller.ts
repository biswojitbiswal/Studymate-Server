import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { TuitionClassService } from "./tuition-class.service";
import { BrowseClassFilterDto } from "./dtos/tuition-class.dto";
import { Public } from "src/common/decorator/public.decorator";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { OptionalJwtAuthGuard } from "common/guards/optionaljwt.guard";

@Controller({
    path: "public/classes",
    version: "1"
})
export class PublicClassController {
    constructor(private readonly classservice: TuitionClassService) { }

    // 7️⃣ Browse classes
    @Public()
    @UseGuards(OptionalJwtAuthGuard)
    @Get('browse')
    async browse(@Query() dto: BrowseClassFilterDto, @GetCurrentUserId() userId: string, @Req() req) {
        return await this.classservice.browse(dto, userId);
    }

    // // 8️⃣ Get public class by id
    @Public()
    @UseGuards(OptionalJwtAuthGuard)
    @Get(':seo_name')
    async getPublicById(@Param('seo_name') seo_name: string, @GetCurrentUserId() userId: string) {
        return await this.classservice.getPublicById(seo_name, userId);
    }
}
