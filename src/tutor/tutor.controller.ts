import { Controller } from "@nestjs/common";
import { TutorService } from "./tutor.service";

@Controller({
    path: "tutor",
    version: "1"
})
export class TutorController{
    constructor(private readonly tutorService: TutorService){}
}




















// POST   /tutors/apply
// GET    /tutors/me
// PATCH  /tutors/me
// GET    /tutors/:id

// /admin/tutors
// /admin/tutor-requests
// /admin/suspend-user
// /admin/approve-tutor
