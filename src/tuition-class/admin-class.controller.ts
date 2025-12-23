import { Controller } from "@nestjs/common";
import { TuitionClassService } from "./tuition-class.service";

@Controller({
    path: "admin/classes",
    version: "1"
})
export class AdminClassController {
    constructor(private readonly classservice: TuitionClassService) { }


    // 9️⃣ Get all classes (admin)
    // @Get()
    // async getAll(
    //     @Query('status') status ?: string,
    //     @Query('tutorId') tutorId ?: string,
    //     @Query('type') type ?: string,
    // ) {
    //     return this.tuitionClass.getAllForAdmin({
    //         status,
    //         tutorId,
    //         type,
    //     });
    // }

    // // 🔟 Update class by admin
    // @Patch(':classId')
    // async update(
    //     @Param('classId') classId: string,
    //     @Body() dto: AdminUpdateTuitionClassDto,
    //     @GetCurrentUserId() adminId: string,
    // ) {
    //     return this.tuitionClass.updateByAdmin(classId, dto, adminId);
    // }

    // // 1️⃣1️⃣ Archive class (admin)
    // @Post(':classId/archive')
    // async archive(
    //     @Param('classId') classId: string,
    //     @GetCurrentUserId() adminId: string,
    // ) {
    //     return this.tuitionClass.archiveByAdmin(classId, adminId);
    // }

    // // 1️⃣2️⃣ Force delete class (admin only)
    // @Delete(':classId')
    // async forceDelete(
    //     @Param('classId') classId: string,
    //     @Body('reason') reason: string,
    //     @GetCurrentUserId() adminId: string,
    // ) {
    //     return this.tuitionClass.forceDelete(classId, reason, adminId);
    // }
}
