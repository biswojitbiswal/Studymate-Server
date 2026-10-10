import { Type } from "class-transformer";
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, ValidateNested } from "class-validator";
import { AttendanceStatus } from "src/common/enums/attendance.enum";

export class StudentAttendanceDto {
    @IsMongoId()
    @IsNotEmpty()
    studentId: string;

    @IsEnum(AttendanceStatus)
    @IsNotEmpty()
    status: AttendanceStatus;
}

export class AttendanceDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StudentAttendanceDto)
    @IsNotEmpty()
    attendance: StudentAttendanceDto[];
}