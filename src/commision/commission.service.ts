import { HttpException, Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCommissionDto, UpdateCommissionDto } from "./dtos/commission.dto";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { Prisma } from "@prisma/client";
import { PriceOn, PriceType } from "src/common/enums/price.enum";
import { RedeemedStatus } from "src/common/enums/coupon.enum";

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCommissionDto) {
    try {
      const row = await this.prisma.commissionSetting.create({
        data: {
          appliesTo: dto.appliesTo,
          type: dto.type,
          value: dto.value,
          status: dto.status
        }
      });

      return row;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException("Commission with this (appliesTo, priceType) already exists");
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }



  async get(id: string) {
    try {
      const row = await this.prisma.commissionSetting.findUnique({ where: { id } });
      if (!row) throw new NotFoundException("Commission Not Found");
      return row;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }



  async getAll(dto: PaginationDto) {
    try {
      const { limit = '10', page = '1', search } = dto;

      const take = parseInt(String(limit), 10) || 10;
      const currentPage = parseInt(String(page), 10) || 1;
      const skip = (currentPage - 1) * take;

      const termRaw = (search || '').trim();
      const term = termRaw;
      const termUpper = termRaw.toUpperCase();

      // Hard-coded enum values
      const priceTypeValues = ['FIXED', 'PERCENTAGE'];
      const priceOnValues = ['CLASS', 'RESOURCES'];

      const searchOr: any[] = [];

      if (termRaw.length > 0) {
        if (priceTypeValues.includes(termUpper)) {
          searchOr.push({ type: termUpper as any });
        }

        if (priceOnValues.includes(termUpper)) {
          searchOr.push({ appliesTo: termUpper as any });
        }

        const parsedNum = Number(termRaw);
        if (!Number.isNaN(parsedNum)) {
          searchOr.push({ value: parsedNum });
        }
      }

      const where: Prisma.CommissionSettingWhereInput = {
        AND: [termRaw ? { OR: searchOr.filter(Boolean) } : {}],
      };

      const [data, total] = await Promise.all([
        this.prisma.commissionSetting.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.commissionSetting.count({ where }),
      ]);

      return {
        total,
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(total / take),
        data,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }



  async delete(id: string) {
    try {
      const exists = await this.prisma.commissionSetting.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException("Commission Not Found");
      await this.prisma.commissionSetting.delete({ where: { id } });
      return exists;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }



  async update(dto: UpdateCommissionDto, id: string) {
    try {
      const exists = await this.prisma.commissionSetting.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException("Commission Not Found");

      const data: any = {};
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.appliesTo !== undefined) data.appliesTo = dto.appliesTo;
      if (dto.value !== undefined) data.value = dto.value;
      if (dto.status !== undefined) data.status = dto.status;

      const updated = await this.prisma.commissionSetting.update({ where: { id }, data });

      return updated;
    } catch (error: any) {
      console.log(error);

      if (error?.code === 'P2002') {
        throw new BadRequestException("Commission with this (appliesTo, priceType) already exists");
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }

}
