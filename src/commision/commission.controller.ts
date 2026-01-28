import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CommissionService } from "./commission.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { Public } from "@prisma/client/runtime/library";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { CreateCommissionDto, UpdateCommissionDto } from "./dtos/commission.dto";

@Controller({ path: 'commission', version: '1' })
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post()
  async create(@Body() dto: CreateCommissionDto) {
    return await this.commissionService.create(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(':id')
  async get(@Param('id') id: string) {
    return await this.commissionService.get(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get()
  async getAll(@Query() dto: PaginationDto) {
    return await this.commissionService.getAll(dto);
  }



  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.commissionService.delete(id);
  }



  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch(':id')
  async update(@Body() dto: UpdateCommissionDto, @Param('id') id: string) {
    return await this.commissionService.update(dto, id);
  }
}
