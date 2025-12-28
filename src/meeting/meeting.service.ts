import { Injectable } from '@nestjs/common';
import { MeetingProvider } from './meeting.types';

@Injectable()
export class MeetingService {

  /**
   * Create meeting URL for a session
   */
  createMeeting(sessionId: string) {
    const roomName = this.buildRoomName(sessionId);

    return {
      meetingLink: `https://meet.jit.si/${roomName}`,
      provider: MeetingProvider.JITSI,
      roomName,
    };
  }

  /**
   * Used by frontend to join meeting
   */
  getJoinConfig(params: {
    sessionId: string;
    displayName: string;
    isTutor: boolean;
  }) {
    return {
      provider: MeetingProvider.JITSI,
      roomName: this.buildRoomName(params.sessionId),
      displayName: params.displayName,
      isModerator: params.isTutor,
    };
  }

  private buildRoomName(sessionId: string): string {
    return `studymate-session-${sessionId}`;
  }
}
