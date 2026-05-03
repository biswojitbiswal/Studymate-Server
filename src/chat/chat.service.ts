import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CreateDMDto, CreateGroupDto, CreateMessageDto, GetMessagesDto } from "./dtos/chat.dto";
import { user } from "@getbrevo/brevo/dist/cjs/api";
import { WebsocketGateway } from "websocket/websocket.gateway";
import { log } from "console";
import { Prisma } from "@prisma/client";

@Injectable({})
export class ChatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly websocket: WebsocketGateway
    ) { }

    async createDm(dto: CreateDMDto, userId: string) {
        try {
            const { receiverId, classId } = dto;

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

            const isSenderTutor = userId === tutorId;
            const isReceiverTutor = receiverId === tutorId;

            if (!isSenderTutor && !isReceiverTutor) {
                throw new BadRequestException(
                    "DM allowed only between student and tutor"
                );
            }

            const studentUserId = isSenderTutor ? receiverId : userId;

            const student = await this.prisma.student.findUnique({
                where: { userId: studentUserId },
                select: {
                    id: true
                }
            })
            if (!student) throw new NotFoundException("Student not found");

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
                select: { studentId: true, student: { select: { user: { select: { id: true } } } } },
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
                            seenAt: null
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
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    avatar: true,
                                },
                            }
                        }

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
                        take: 1,
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
            const result = await Promise.all(
                conversations.map(async (conv) => {
                    const lastMessage = conv.messages[0] || null;

                    const otherParticipants = conv.participants.filter(
                        (p) => p.userId !== userId
                    );

                    const myParticipant = conv.participants.find(
                        (p) => p.userId === userId
                    );

                    const lastSeenId = myParticipant?.lastSeenMessageId;

                    let unreadCount = 0;

                    if (lastSeenId) {
                        const lastSeenMsg = await this.prisma.message.findUnique({
                            where: { id: lastSeenId },
                            select: { createdAt: true },
                        });

                        unreadCount = await this.prisma.message.count({
                            where: {
                                conversationId: conv.id,
                                createdAt: {
                                    gt: lastSeenMsg?.createdAt ?? new Date(0),
                                },
                                senderId: {
                                    not: userId,
                                },
                                isDeleted: false,
                            },
                        });
                    } else {
                        unreadCount = await this.prisma.message.count({
                            where: {
                                conversationId: conv.id,
                                senderId: {
                                    not: userId,
                                },
                                isDeleted: false,
                            },
                        });
                    }

                    return {
                        id: conv.id,
                        type: conv.type,
                        classId: conv.classId,
                        classTitle: conv.klass?.title,
                        groupImage: conv.klass?.previewImg,
                        participants: otherParticipants,
                        lastMessage,
                        updatedAt: conv.updatedAt,
                        unreadCount,
                        isMuted: myParticipant?.isMuted || false,
                    };
                })
            );

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
                select: {
                    id: true,
                    type: true,
                    klass: {
                        select: {
                            id: true,
                            title: true,
                            previewImg: true
                        }
                    },
                    participants: {
                        select: {
                            lastSeenMessageId: true,
                            userId: true,
                            isMuted: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    avatar: true,
                                    lastSeenAt: true,
                                    isOnline: true
                                }
                            }
                        }
                    },
                },
            });

            if (!conversation) {
                throw new NotFoundException("Conversation not found");
            }

            const currentParticipant = conversation.participants.find(
                (p) => p.userId === userId
            );

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

            // ✅ TYPE SAFE MESSAGE WITH RECEIPTS
            type MessageWithReceipts = Prisma.MessageGetPayload<{
                include: {
                    sender: {
                        select: {
                            id: true;
                            avatar: true;
                            name: true;
                        };
                    };
                    replyTo: true;
                    receipts: {
                        select: {
                            userId: true;
                            seenAt: true;
                        };
                    };
                };
            }>;

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
                    sender: {
                        select: {
                            id: true,
                            avatar: true,
                            name: true,
                        },
                    },
                    replyTo: true,
                    receipts: {
                        select: {
                            userId: true,
                            seenAt: true,
                        },
                    },
                },
            });

            const orderedMessages = messages.reverse();


            // GROUP
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

            // ✅ FORMAT FOR FRONTEND (IMPORTANT)
            const formattedMessages = orderedMessages.map((msg) => {
                const m = msg as typeof msg & {
                    receipts: { userId: string; seenAt: Date | null }[];
                };

                const otherReceipt = m.receipts.find(
                    (r) => r.userId !== userId
                );

                return {
                    ...msg,
                    seenAt: otherReceipt?.seenAt || null,
                };
            });

            // 🧠 7. Return response
            return {
                conversation: {
                    id: conversation.id,
                    type: conversation.type,

                    lastSeenMessageId: currentParticipant?.lastSeenMessageId || null,

                    // 🔥 computed (for UI)
                    displayName: conversation.type === "GROUP"
                        ? conversation.klass?.title
                        : conversation.participants.find(p => p.userId !== userId)?.user?.name,

                    displayImage: conversation.type === "GROUP"
                        ? conversation.klass?.previewImg
                        : conversation.participants.find(p => p.userId !== userId)?.user?.avatar,

                    // 🔥 status (DM only)
                    status: conversation.type === "DM"
                        ? {
                            isOnline: conversation.participants.find(p => p.userId !== userId)?.user?.isOnline,
                            lastSeenAt: conversation.participants.find(p => p.userId !== userId)?.user?.lastSeenAt,
                        }
                        : null,

                    isMuted: currentParticipant?.isMuted || false,
                },
                messages: formattedMessages,
                nextCursor: messages.length === take ? messages[0].id : null,
            };
        } catch (error) {
            throw error;
        }
    }


    async deleteForMe(messageId: string, userId: string) {
        const msg = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: { id: true, conversationId: true },
        });

        if (!msg) throw new NotFoundException("Message not found");

        // optional: ensure user is participant of this conversation
        const isParticipant = await this.prisma.conversationParticipants.findFirst({
            where: { conversationId: msg.conversationId, userId },
        });
        if (!isParticipant) {
            throw new BadRequestException("Not part of this conversation");
        }

        // idempotent insert (avoid duplicates)
        await this.prisma.messageHidden.upsert({
            where: {
                userId_messageId: { userId, messageId }, // composite unique
            },
            update: {},
            create: { userId, messageId },
        });

        return { messageId, conversationId: msg.conversationId };
    }


    async deleteForEveryone(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: {
                id: true,
                senderId: true,
                conversationId: true,
                isDeleted: true,
            },
        });

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        // ❗ Only sender can delete
        if (message.senderId !== userId) {
            throw new BadRequestException("Not allowed");
        }

        // ✅ Already deleted → do nothing
        if (message.isDeleted) {
            return {
                messageId,
                conversationId: message.conversationId,
            };
        }

        // ✅ Ensure user is participant (extra safety)
        const isParticipant = await this.prisma.conversationParticipants.findFirst({
            where: {
                conversationId: message.conversationId,
                userId,
            },
        });

        if (!isParticipant) {
            throw new BadRequestException("Not part of this conversation");
        }

        // 🔥 Update message
        await this.prisma.message.update({
            where: { id: messageId },
            data: {
                isDeleted: true,
                // deletedAt: new Date(),
                content: "This message was deleted",
                replyToId: null, // ✅ prevent broken reply chain
            },
        });

        // 🔥 Emit only once per user
        const participants = await this.prisma.conversationParticipants.findMany({
            where: { conversationId: message.conversationId },
            select: { userId: true },
        });

        for (const p of participants) {
            this.websocket.server.to(p.userId).emit("message_deleted", {
                messageId,
                conversationId: message.conversationId,
            });
        }

        return {
            messageId,
            conversationId: message.conversationId,
        };
    }


    async pinMessage(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: {
                id: true,
                conversationId: true,
            },
        });

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        // ✅ ensure user is participant
        const participant = await this.prisma.conversationParticipants.findFirst({
            where: {
                conversationId: message.conversationId,
                userId,
            },
        });

        if (!participant) {
            throw new BadRequestException("Not part of conversation");
        }

        // 🔥 set pinned message
        await this.prisma.conversation.update({
            where: { id: message.conversationId },
            data: {
                pinnedMessageId: message.id,
            },
        });

        // 🔥 emit socket
        const participants = await this.prisma.conversationParticipants.findMany({
            where: { conversationId: message.conversationId },
            select: { userId: true },
        });

        for (const p of participants) {
            this.websocket.server.to(p.userId).emit("message_pinned", {
                messageId: message.id,
                conversationId: message.conversationId,
            });
        }

        return {
            messageId: message.id,
            conversationId: message.conversationId,
        };
    }


    async unpinMessage(conversationId: string, userId: string) {
        const participant = await this.prisma.conversationParticipants.findFirst({
            where: { conversationId, userId },
        });

        if (!participant) {
            throw new BadRequestException("Not part of conversation");
        }

        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                pinnedMessageId: null,
            },
        });

        const participants = await this.prisma.conversationParticipants.findMany({
            where: { conversationId },
            select: { userId: true },
        });

        for (const p of participants) {
            this.websocket.server.to(p.userId).emit("message_unpinned", {
                conversationId,
            });
        }

        return { conversationId };
    }



    async togglePinMessage(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: {
                id: true,
                conversationId: true,
                isDeleted: true,
            },
        });

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        if (message.isDeleted) {
            throw new BadRequestException("Cannot pin deleted message");
        }

        // ✅ check participant
        const participant = await this.prisma.conversationParticipants.findFirst({
            where: {
                conversationId: message.conversationId,
                userId,
            },
        });

        if (!participant) {
            throw new BadRequestException("Not part of conversation");
        }

        // 🔥 get current pinned
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: message.conversationId },
            select: { pinnedMessageId: true },
        });

        let newPinnedId: string | null = null;
        let event = "";

        if (conversation?.pinnedMessageId === messageId) {
            // 🔴 UNPIN
            newPinnedId = null;
            event = "message_unpinned";
        } else {
            // 🟢 PIN (replace or new)
            newPinnedId = messageId;
            event = "message_pinned";
        }

        // 🔥 update
        await this.prisma.conversation.update({
            where: { id: message.conversationId },
            data: {
                pinnedMessageId: newPinnedId,
            },
        });

        // 🔥 emit socket
        const participants = await this.prisma.conversationParticipants.findMany({
            where: { conversationId: message.conversationId },
            select: { userId: true },
        });

        for (const p of participants) {
            this.websocket.server.to(p.userId).emit(event, {
                messageId: newPinnedId,
                conversationId: message.conversationId,
            });
        }

        return {
            messageId: newPinnedId,
            conversationId: message.conversationId,
            isPinned: !!newPinnedId,
        };
    }



    async toggleMute(conversationId: string, userId: string) {
        const participant = await this.prisma.conversationParticipants.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId,
                },
            },
            select: {
                isMuted: true,
            },
        });

        if (!participant) {
            throw new BadRequestException("Not part of conversation");
        }

        const updated = await this.prisma.conversationParticipants.update({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId,
                },
            },
            data: {
                isMuted: !participant.isMuted,
            },
        });

        return {
            conversationId,
            isMuted: updated.isMuted,
        };
    }
}