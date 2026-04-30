import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { WithdrawDto } from "./dtos/ledger.dto";
import { PaginationDto } from "common/dtos/pagination.dto";

@Injectable({})
export class WalletService {
    constructor(private readonly prisma: PrismaService) { }


    async withdraw(userId: string, dto: WithdrawDto) {
        try {            
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor account not found");
            
            return await this.prisma.$transaction(async (tx) => {

                const updated = await tx.wallet.updateMany({
                    where: {
                        tutorId: tutor.id,
                        availableBalance: { gte: dto.amount }
                    },
                    data: {
                        availableBalance: { decrement: dto.amount }
                    }
                });                

                if (updated.count === 0) {
                    throw new BadRequestException("Insufficient balance");
                }

                const withdrawal = await tx.withdrawal.create({
                    data: {
                        tutorId: tutor.id,
                        amount: dto.amount,
                        method: dto.method,
                        accountName: dto.accountName,
                        accountNumber: dto.accountNumber,
                        ifsc: dto.ifsc,
                        upiId: dto.upiId,
                        status: "SUCCESS",
                        processedAt: new Date()
                    }
                });

                await tx.ledger.create({
                    data: {
                        tutorId: tutor.id,
                        type: "DEBIT",
                        amount: dto.amount,
                        source: "WITHDRAWAL",
                        status: "COMPLETED",
                        referenceId: withdrawal.id
                    }
                });

                await tx.wallet.update({
                    where: { tutorId: tutor.id },
                    data: {
                        totalWithdrawn: { increment: dto.amount }
                    }
                });

                return withdrawal;
            });
        } catch (error) {
            throw error;
        }
    }


    async getWithdraw(userId: string, dto: PaginationDto) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!tutor) {
                throw new NotFoundException("Tutor not found");
            }

            // 2. Pagination params
            const page = Math.max(1, dto.page ?? 1);
            const limit = Math.min(50, dto.limit ?? 10);
            const skip = (page - 1) * limit;

            // 3. Fetch withdrawals + total count
            const [withdrawals, total, wallet] = await this.prisma.$transaction([
                this.prisma.withdrawal.findMany({
                    where: { tutorId: tutor.id },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit
                }),
                this.prisma.withdrawal.count({
                    where: { tutorId: tutor.id }
                }),
                this.prisma.wallet.findUnique({
                    where: {tutorId: tutor.id}
                })
            ]);

            // 4. Return paginated response
            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                wallet,
                withdrawals,
            };

        } catch (error) {
            throw error;
        }
    }


    async getAll(dto: PaginationDto){
        try {
            const page = Math.max(1, dto.page ?? 1);
            const limit = Math.min(50, dto.limit ?? 10);
            const skip = (page - 1) * limit;

            // 3. Fetch withdrawals + total count
            const [withdrawals, total] = await this.prisma.$transaction([
                this.prisma.withdrawal.findMany({
                    where: {},
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                    
                }),
                this.prisma.withdrawal.count({
                    where: { }
                })
            ]);

            // 4. Return paginated response
            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                withdrawals,
            };
        } catch (error) {
            
        }
    }
}