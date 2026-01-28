import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTaxSettingDto, UpdateTaxSettingDto } from "./dtos/tax-setting.dto";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class TaxSettingService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateTaxSettingDto) {
    try {
      const row = await this.prisma.taxSetting.create({
        data: {
          name: dto.name,
          value: dto.value,
          status: dto.status,
        }
      });

      return row;
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException("TaxSetting name already exists");
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }



  async get(id: string) {
    try {
      const row = await this.prisma.taxSetting.findUnique({ where: { id } });

      if (!row) throw new NotFoundException("TaxSetting Not Found");

      return row;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }



  async getAll(dto: PaginationDto) {
    try {
      const page = dto.page ?? 1;
      const limit = dto.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: Prisma.TaxSettingWhereInput = dto.search
        ? {
          name: {
            contains: dto.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }
        : {};

      const [taxes, total] = await this.prisma.$transaction([
        this.prisma.taxSetting.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.taxSetting.count({
          where,
        }),
      ]);

      return {
        page,
        limit,
        total,
        data: taxes,
      };
    } catch (error) {
      throw error;
    }
  }



  async delete(id: string) {
    try {
      const exists = await this.prisma.taxSetting.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException("TaxSetting Not Found");
      await this.prisma.taxSetting.delete({ where: { id } });
      return exists;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }



  async update(dto: UpdateTaxSettingDto, id: string) {
    try {
      const exists = await this.prisma.taxSetting.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException("TaxSetting Not Found");

      const data: any = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.value !== undefined) data.value = dto.value;
      if (dto.status !== undefined) data.status = dto.status;

      const updated = await this.prisma.taxSetting.update({ where: { id }, data });
      return updated;
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException("TaxSetting name already exists");
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Internal Server Error");
    }
  }
}
