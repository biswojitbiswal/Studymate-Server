import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from 'src/common/decorator/roles.decorator';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id.decorator';
import { InvoiceService } from './invoice.service';

@Controller({ path: 'invoice', version: '1' })
@Roles('STUDENT')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('order/:orderId/prepare')
  prepare(
    @Param('orderId') orderId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.invoiceService.prepareForPaidOrder(orderId, userId);
  }

  @Get('order/:orderId')
  getStatus(
    @Param('orderId') orderId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.invoiceService.getForOrder(orderId, userId);
  }

  @Get('order/:orderId/download')
  async download(
    @Param('orderId') orderId: string,
    @GetCurrentUserId() userId: string,
    @Res() response: Response,
  ) {
    const file = await this.invoiceService.getPdf(orderId, userId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    response.setHeader('Content-Length', file.data.length.toString());
    response.end(file.data);
  }
}
