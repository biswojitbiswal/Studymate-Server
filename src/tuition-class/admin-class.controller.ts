import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { TuitionClassService } from "./tuition-class.service";
import { AdminTuitionClassFilter, AdminUpdateTuitionClassDto } from "./dtos/tuition-class.dto";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { AuthGuard } from "src/common/guards/auth.guard";

@Controller({
    path: "admin/classes",
    version: "1"
})
export class AdminClassController {
    constructor(private readonly classservice: TuitionClassService) { }


    // 9️⃣ Get all classes (admin)
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    async getAll(
        @Query() dto: AdminTuitionClassFilter
    ) {
        return this.classservice.getAllForAdmin(dto);
    }


    // 1️⃣1️⃣ Archive class (admin)
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch('archive/:classId')
    async archive(
        @Param('classId') classId: string,
        @GetCurrentUserId() adminId: string,
    ) {
        return await this.classservice.archiveByAdmin(classId, adminId);
    }
}
