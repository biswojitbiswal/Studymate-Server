export enum MeetingProvider {
  JITSI = 'JITSI',
  INTERNAL = 'INTERNAL',
}

export interface CreateMeetingInput {
  sessionId: string;
  tutorId: string;
  classId: string;
}

export interface MeetingResult {
  meetingLink: string;
  provider: MeetingProvider;
}
