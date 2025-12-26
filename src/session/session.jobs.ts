// POST /api/v1/sessions/private/request
// POST /api/v1/sessions/:id/approve
// POST /api/v1/sessions/private/manual
// GET /api/v1/classes/:id/sessions
// GET /api/v1/sessions/upcoming


// session/
//  ├── session.module.ts
//  ├── session.controller.ts
//  ├── session.service.ts
//  ├── dto/
//  │   ├── request-private-session.dto.ts
//  │   ├── approve-session.dto.ts
//  │   ├── create-extra-session.dto.ts
//  │   └── reschedule-session.dto.ts
//  └── helpers/
//      └── ensure-group-sessions.ts


// POST   /api/v1/sessions/private/request
// POST   /api/v1/sessions/:id/approve
// POST   /api/v1/sessions/private/manual
// GET    /api/v1/sessions/class/:classId
// GET    /api/v1/sessions/upcoming
