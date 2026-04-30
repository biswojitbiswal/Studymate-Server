import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CreateLedgerDto } from "./dtos/ledger.dto";
import { error } from "console";
import { LedgerSource, LedgerStatus, LedgerType } from "common/enums/payout.enum";

@Injectable({})
export class LedgerService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateLedgerDto) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { id: dto.tutorId },
                select: { id: true }
            })
            if (!tutor) throw new NotFoundException("Tutor Not found");

            const result = await this.prisma.$transaction(async (tx) => {
                const ledger = await tx.ledger.create({
                    data: {
                        tutorId: tutor.id,
                        status: LedgerStatus.PENDING,
                        amount: dto.amount,
                        source: LedgerSource.CLASS_PURCHASE,
                        type: LedgerType.CREDIT,
                        referenceId: dto.referenceId
                    }
                })

                const wallet = await tx.wallet.upsert({
                    where: {
                        tutorId: tutor.id
                    },
                    create: {
                        tutorId: tutor.id,
                        pendingBalance: dto.amount,
                        availableBalance: 0,
                        totalEarnings: dto.amount,
                        totalWithdrawn: 0
                    },
                    update: {
                        pendingBalance: { increment: ledger.amount },
                        totalEarnings: { increment: ledger.amount }
                    },
                })

                return {ledger, wallet};
            })

            return result;
        } catch (error) {
            throw error;
        }
    }

    
    async availLedger(classId: string, tutorId: string){
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const ledgers = await tx.ledger.findMany({
                    where: {
                        referenceId: classId, 
                        type: LedgerType.CREDIT, 
                        source: LedgerSource.CLASS_PURCHASE, 
                        status: LedgerStatus.PENDING
                    },
                    select: {
                        id: true,
                        amount: true
                    }
                })

                if (!ledgers.length) return null;

                const totalAmount = ledgers.reduce((sum, l) => sum + (l.amount || 0), 0);
                const ledgerIds = ledgers.map(l => (l.id));

                await tx.ledger.updateMany({
                    where: {
                        id: {in: ledgerIds},
                        status: LedgerStatus.PENDING
                    },
                    data:{
                        status: LedgerStatus.AVAILABLE
                    }
                })

                const wallet = await tx.wallet.update({
                    where: {
                        tutorId: tutorId
                    },
                    data: {
                        pendingBalance: {decrement: totalAmount},
                        availableBalance: {increment: totalAmount},
                    }
                })

                return wallet;
            })

            return result;
        } catch (error) {
            throw error;
        }
    }
}