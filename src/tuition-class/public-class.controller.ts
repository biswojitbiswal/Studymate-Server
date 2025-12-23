import { Controller } from "@nestjs/common";
import { TuitionClassService } from "./tuition-class.service";

@Controller({
    path: "public/classes",
    version: "1"
})
export class PublicClassController {
    constructor(private readonly classservice: TuitionClassService) { }

    // 7️⃣ Browse classes
    // @Get('browse')
    // async browse(
    //     @Query('subjectId') subjectId ?: string,
    //     @Query('levelId') levelId ?: string,
    //     @Query('type') type ?: string,
    //     @Query('price') price ?: 'free' | 'paid',
    //     @Query('search') search ?: string,
    // ) {
    //     return this.tuitionClass.browse({
    //         subjectId,
    //         levelId,
    //         type,
    //         price,
    //         search,
    //     });
    // }

    // // 8️⃣ Get public class by id
    // @Get(':classId')
    // async getPublicById(@Param('classId') classId: string) {
    //     return this.tuitionClass.getPublicById(classId);
    // }
}
