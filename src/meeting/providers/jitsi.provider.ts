import { Injectable } from "@nestjs/common";
import { CreateMeetingInput, MeetingProvider, MeetingResult } from "../meeting.types";

@Injectable()
export class JitsiProvider {
  async create(input: CreateMeetingInput): Promise<MeetingResult> {
    const roomName = `studymate-session-${input.sessionId}`;

    return {
      meetingLink: `https://meet.jit.si/${roomName}`,
      provider: MeetingProvider.JITSI,
    };
  }


  async cancelMeeting(_: string) {}
}
