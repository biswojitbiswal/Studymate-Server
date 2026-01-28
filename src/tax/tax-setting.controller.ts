import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TaxSettingService } from "./tax-setting.service";
import { CreateTaxSettingDto, UpdateTaxSettingDto } from "./dtos/tax-setting.dto";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { AuthGuard } from "src/common/guards/auth.guard";

@Controller({ path: 'tax-setting', version: '1' })
export class TaxSettingController {
  constructor(private readonly taxService: TaxSettingService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post()
  async create(@Body() dto: CreateTaxSettingDto) {
    return await this.taxService.create(dto);
  }



  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(':id')
  async get(@Param('id') id: string) {
    return await this.taxService.get(id);
  }



  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get()
  async getAll(@Query() dto: PaginationDto) {
    return await this.taxService.getAll(dto);
  }



  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.taxService.delete(id);
  }



  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch(':id')
  async update(@Body() dto: UpdateTaxSettingDto, @Param('id') id: string) {
    return await this.taxService.update(dto, id);
  }
}
