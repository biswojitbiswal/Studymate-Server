import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CreateDMDto, CreateGroupDto, CreateMessageDto, GetMessagesDto } from "./dtos/chat.dto";
import { user } from "@getbrevo/brevo/dist/cjs/api";
import { WebsocketGateway } from "websocket/websocket.gateway";
import { log } from "console";

@Injectable({})
export class ChatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly websocket: WebsocketGateway
    ) { }

    async createDm(dto: CreateDMDto, userId: string) {
        try {
            const { receiverId, classId } = dto;
            console.log(dto);
            
            if (receiverId === userId) throw new BadRequestException("You can't message yourself");

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
                include: {
                    tutor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                }
            });

            if (!klass) {
                throw new NotFoundException("Class not found");
            }

            const tutorId = klass.tutor.user.id;
            // console.log(userId, tutorId, klass.tutor.user.id);
            
            const isSenderTutor = userId === tutorId;
            const isReceiverTutor = receiverId === tutorId;

            if (!isSenderTutor && !isReceiverTutor) {
                throw new BadRequestException(
                    "DM allowed only between student and tutor"
                );
            }

            const studentUserId = isSenderTutor ? receiverId : userId;

            const student = await this.prisma.student.findUnique({
                where: {userId: studentUserId},
                select: {
                    id: true
                }
            })
            if(!student) throw new NotFoundException("Student not found");

            const enrollment = await this.prisma.classEnrollment.findFirst({
                where: {
                    classId,
                    studentId: student?.id,
                },
            });

            if (!enrollment) {
                throw new BadRequestException("Student is not enrolled in this class");
            }

            const conversations = await this.prisma.conversation.findMany({
                where: {
                    type: "DM",
                    classId,
                    participants: {
                        some: { userId },
                    },
                },
                include: {
                    participants: true,
                },
            });

            const existing = conversations.find((conv) => {
                const ids = conv.participants.map((p) => p.userId);
                return (
                    ids.length === 2 &&
                    ids.includes(userId) &&
                    ids.includes(receiverId)
                );
            });

            if (existing) return existing;

            const conversation = await this.prisma.conversation.create({
                data: {
                    type: "DM",
                    classId,
                    createdById: userId,
                    participants: {
                        create: [
                            { userId },
                            { userId: receiverId },
                        ],
                    },
                },
                include: {
                    participants: true,
                },
            });

            // ✅ 8. Settings
            await this.prisma.conversationSetting.create({
                data: {
                    conversationId: conversation.id,
                },
            });
            console.log(conversation);
            

            return conversation;
        } catch (error) {
            throw error;
        }
    }



    async createGroup(dto: CreateGroupDto, userId: string) {
        try {
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: dto.classId },
                select: {
                    id: true,
                    tutor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                }
            });

            if (!klass) {
                throw new NotFoundException("Class not found");
            }

            if (klass.tutor.user.id !== userId) {
                throw new BadRequestException("Only tutor can create group chat");
            }

            const existing = await this.prisma.conversation.findFirst({
                where: {
                    type: "GROUP",
                    classId: dto.classId,
                },
            });

            if (existing) return existing;

            const enrollments = await this.prisma.classEnrollment.findMany({
                where: { classId: dto.classId },
                select: { studentId: true, student: {select: {user: {select: {id: true}}}} },
            });

            const participants = [
                { userId },
                ...enrollments.map((e) => ({ userId: e.student.user.id })),
            ];

            const uniqueParticipants = Array.from(
                new Map(participants.map(p => [p.userId, p])).values()
            );

            const conversation = await this.prisma.conversation.create({
                data: {
                    type: "GROUP",
                    classId: dto.classId,
                    createdById: userId,
                    participants: {
                        create: uniqueParticipants,
                    },
                },
                include: {
                    participants: true,
                },
            });

            await this.prisma.conversationSetting.create({
                data: {
                    conversationId: conversation.id,
                },
            });

            return conversation;
        } catch (error) {
            throw error;
        }
    }


    async createMessage(dto: CreateMessageDto, userId: string) {
        try {
            const { conversationId, content, replyToId } = dto;

            const conversation = await this.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    participants: true,
                },
            });

            if (!conversation) {
                throw new NotFoundException("Conversation not found");
            }

            const isParticipant = conversation.participants.some(
                (p) => p.userId === userId
            );

            if (!isParticipant) {
                throw new BadRequestException("You are not part of this conversation");
            }

            const setting = await this.prisma.conversationSetting.findUnique({
                where: { conversationId },
            });

            if (setting?.mode === "READ_ONLY") {
                throw new BadRequestException("Chat is read-only");
            }

            if (setting?.mode === "LIMITED") {
                if (conversation.createdById !== userId) {
                    throw new BadRequestException("Only tutor can send messages");
                }
            }

            if (replyToId) {
                const replyMsg = await this.prisma.message.findUnique({
                    where: { id: replyToId },
                });

                if (!replyMsg || replyMsg.conversationId !== conversationId) {
                    throw new BadRequestException("Invalid reply message");
                }
            }

            const message = await this.prisma.message.create({
                data: {
                    conversationId,
                    senderId: userId,
                    content,
                    replyToId: replyToId || null,
                },
                include: {
                    sender: true,
                    replyTo: true,
                },
            });

            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageId: message.id },
            });

            if (conversation.type === "DM") {
                const otherUser = conversation.participants.find(
                    (p) => p.userId !== userId
                );

                if (otherUser) {
                    await this.prisma.messageReceipt.create({
                        data: {
                            messageId: message.id,
                            userId: otherUser.userId,
                        },
                    });
                }
            }

            this.websocket.sendToConversation(conversationId, {
                type: "NEW_MESSAGE",
                data: message,
            });

            return message;
        } catch (error) {
            throw error;
        }
    }



    async getConversations(userId: string) {
        try {
            const conversations = await this.prisma.conversation.findMany({
                where: {
                    participants: {
                        some: { userId },
                    },
                },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    klass: {
                        select: {
                            id: true,
                            title: true,
                            previewImg: true
                        }
                    },
                    messages: {
                        where: {
                            isDeleted: false,
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                        take: 1, // only last message
                    },
                },
                orderBy: {
                    updatedAt: "desc",
                },
            });

            // // ✅ 2. Filter logic
            // const filtered = conversations.filter((conv) => {
            //     if (conv.type === "GROUP") return true;

            //     // DM → must have at least 1 message
            //     return conv.messages.length > 0;
            // });

            // ✅ 3. Format response (important for frontend)
            const result = conversations.map((conv) => {
                const lastMessage = conv.messages[0] || null;

                // remove self from participants (for DM display)
                const otherParticipants = conv.participants.filter(
                    (p) => p.userId !== userId
                );

                return {
                    id: conv.id,
                    type: conv.type,
                    classId: conv.classId,
                    classTitle: conv.klass?.title,
                    groupImage: conv.klass?.previewImg,
                    participants: otherParticipants,
                    lastMessage,
                    updatedAt: conv.updatedAt,
                };
            });

            return result;
        } catch (error) {
            throw error;
        }
    }


    async getMessages(dto: GetMessagesDto, userId: string) {
        try {
            const { conversationId, cursor, limit = "20" } = dto;

            const take = parseInt(limit);

            const conversation = await this.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    participants: true,
                },
            });

            if (!conversation) {
                throw new NotFoundException("Conversation not found");
            }

            const isParticipant = conversation.participants.some(
                (p) => p.userId === userId
            );

            if (!isParticipant) {
                throw new BadRequestException("Not allowed");
            }

            const hidden = await this.prisma.messageHidden.findMany({
                where: { userId },
                select: { messageId: true },
            });

            const hiddenIds = hidden.map((h) => h.messageId);

            let cursorObj: { id: string } | undefined;

            const queryOptions: any = {};

            if (cursorObj) {
                queryOptions.cursor = cursorObj;
                queryOptions.skip = 1;
            }

            const messages = await this.prisma.message.findMany({
                where: {
                    conversationId,
                    id: {
                        notIn: hiddenIds,
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: take,
                ...queryOptions,
                include: {
                    conversation:{
                        select: {
                            id: true,
                            type: true
                        }
                    },
                    sender: {
                        select: {
                            id: true,
                            avatar: true,
                            name: true
                        }
                    },
                    replyTo: true,
                },
            });

            const orderedMessages = messages.reverse();

            // 🧠 6. MARK AS SEEN

            if (conversation.type === "DM") {
                // update receipts
                await this.prisma.messageReceipt.updateMany({
                    where: {
                        userId,
                        message: {
                            conversationId,
                        },
                        seenAt: null,
                    },
                    data: {
                        seenAt: new Date(),
                    },
                });
            } else {
                // group → update lastSeenMessageId
                const lastMessage = orderedMessages[orderedMessages.length - 1];

                if (lastMessage) {
                    await this.prisma.conversationParticipants.updateMany({
                        where: {
                            conversationId,
                            userId,
                        },
                        data: {
                            lastSeenMessageId: lastMessage.id,
                        },
                    });
                }
            }

            // 🧠 7. Return response
            return {
                messages: orderedMessages,
                nextCursor: messages.length === take ? messages[0].id : null,
            };
        } catch (error) {
            throw error;
        }
    }
}