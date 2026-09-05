import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TablesService } from './tables.service';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get(':slug/:tableNumber/session')
  getOrCreate(
    @Param('slug') slug: string,
    @Param('tableNumber') tableNumber: string,
  ) {
    return this.tablesService.getOrCreateSession(slug, tableNumber);
  }

  @Get('sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.tablesService.getSession(sessionId);
  }

  @Post('sessions/:sessionId/lines')
  addLine(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      guestId: string;
      guestName?: string;
      menuItemId?: string;
      name: string;
      unitPrice: number;
      quantity?: number;
      imageUrl?: string | null;
      modifiers?: { optionId: string; name: string; priceDelta: number }[];
    },
  ) {
    return this.tablesService.addLine(sessionId, body);
  }

  @Patch('sessions/:sessionId/lines/:lineId')
  updateLine(
    @Param('sessionId') sessionId: string,
    @Param('lineId') lineId: string,
    @Body() body: { quantity: number; guestId: string },
  ) {
    return this.tablesService.updateLine(sessionId, lineId, body);
  }

  @Delete('sessions/:sessionId/lines/:lineId')
  removeLine(
    @Param('sessionId') sessionId: string,
    @Param('lineId') lineId: string,
    @Query('guestId') guestId: string,
  ) {
    return this.tablesService.removeLine(sessionId, lineId, guestId);
  }

  @Post('sessions/:sessionId/order')
  sendToKitchen(
    @Param('sessionId') sessionId: string,
    @Body() body: { note?: string },
  ) {
    return this.tablesService.sendToKitchen(sessionId, body.note);
  }

  @Patch('sessions/:sessionId/split')
  setSplit(
    @Param('sessionId') sessionId: string,
    @Body() body: { splitMode: 'none' | 'by_person' | 'by_item'; guestCount?: number },
  ) {
    return this.tablesService.setSplit(sessionId, body);
  }

  @Post('sessions/:sessionId/pay')
  pay(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      method: 'pix' | 'apple_pay' | 'google_pay' | 'card';
      amount: number;
      guestId?: string;
    },
  ) {
    return this.tablesService.createPayment(sessionId, body);
  }

  @Post('payments/:paymentId/confirm')
  confirmPayment(@Param('paymentId') paymentId: string) {
    return this.tablesService.confirmPayment(paymentId);
  }
}
