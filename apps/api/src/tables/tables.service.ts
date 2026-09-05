import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SplitMode,
  TableSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeSession(
    session: Prisma.TableSessionGetPayload<{
      include: {
        lines: true;
        orders: true;
        payments: true;
        restaurant: { select: { id: true; slug: true; name: true; watermark: true; primaryColor: true } };
      };
    }>,
  ) {
    const lines = session.lines.map((line) => ({
      lineId: line.id,
      itemId: line.menuItemId,
      guestId: line.guestId,
      guestName: line.guestName,
      name: line.name,
      unitPrice: Number(line.unitPrice),
      quantity: line.quantity,
      imageUrl: line.imageUrl,
      modifiers: (line.modifiers as { optionId: string; name: string; priceDelta: number }[] | null) ?? [],
    }));

    const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

    return {
      id: session.id,
      tableNumber: session.tableNumber,
      status: session.status,
      splitMode: session.splitMode,
      guestCount: session.guestCount,
      restaurant: session.restaurant,
      lines,
      total,
      orders: session.orders.map((o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
      })),
      payments: session.payments.map((p) => ({
        id: p.id,
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
        guestId: p.guestId,
        meta: p.meta,
      })),
      updatedAt: session.updatedAt,
    };
  }

  private async loadSession(sessionId: string) {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        lines: { orderBy: { createdAt: 'asc' } },
        orders: { orderBy: { createdAt: 'desc' }, take: 5 },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
            watermark: true,
            primaryColor: true,
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessão da mesa não encontrada');
    return session;
  }

  async getOrCreateSession(slug: string, tableNumber: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    });
    if (!restaurant) throw new NotFoundException(`Restaurante "${slug}" não encontrado`);

    let session = await this.prisma.tableSession.findFirst({
      where: {
        restaurantId: restaurant.id,
        tableNumber,
        status: { in: [TableSessionStatus.open, TableSessionStatus.ordered] },
      },
      include: {
        lines: { orderBy: { createdAt: 'asc' } },
        orders: { orderBy: { createdAt: 'desc' }, take: 5 },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
            watermark: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!session) {
      session = await this.prisma.tableSession.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber,
          status: TableSessionStatus.open,
        },
        include: {
          lines: true,
          orders: true,
          payments: true,
          restaurant: {
            select: {
              id: true,
              slug: true,
              name: true,
              watermark: true,
              primaryColor: true,
            },
          },
        },
      });
    }

    return this.serializeSession(session);
  }

  async getSession(sessionId: string) {
    return this.serializeSession(await this.loadSession(sessionId));
  }

  async addLine(
    sessionId: string,
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
    const session = await this.loadSession(sessionId);
    if (session.status === TableSessionStatus.closed) {
      throw new BadRequestException('Mesa já fechada');
    }

    await this.prisma.tableCartLine.create({
      data: {
        sessionId,
        menuItemId: body.menuItemId,
        guestId: body.guestId,
        guestName: body.guestName?.trim() || 'Convidado',
        name: body.name,
        unitPrice: body.unitPrice,
        quantity: body.quantity ?? 1,
        imageUrl: body.imageUrl ?? null,
        modifiers: body.modifiers ?? [],
      },
    });

    return this.getSession(sessionId);
  }

  async updateLine(
    sessionId: string,
    lineId: string,
    body: { quantity: number; guestId: string },
  ) {
    const line = await this.prisma.tableCartLine.findFirst({
      where: { id: lineId, sessionId },
    });
    if (!line) throw new NotFoundException('Item não encontrado');

    if (body.quantity <= 0) {
      await this.prisma.tableCartLine.delete({ where: { id: lineId } });
    } else {
      await this.prisma.tableCartLine.update({
        where: { id: lineId },
        data: { quantity: body.quantity },
      });
    }

    return this.getSession(sessionId);
  }

  async removeLine(sessionId: string, lineId: string, _guestId: string) {
    const line = await this.prisma.tableCartLine.findFirst({
      where: { id: lineId, sessionId },
    });
    if (!line) throw new NotFoundException('Item não encontrado');
    await this.prisma.tableCartLine.delete({ where: { id: lineId } });
    return this.getSession(sessionId);
  }

  async sendToKitchen(sessionId: string, note?: string) {
    const session = await this.loadSession(sessionId);
    if (session.lines.length === 0) {
      throw new BadRequestException('Carrinho vazio');
    }

    const payload = session.lines.map((l) => ({
      id: l.id,
      name: l.name,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      guestName: l.guestName,
      modifiers: l.modifiers,
    }));

    await this.prisma.order.create({
      data: {
        sessionId,
        payload,
        note: note ?? null,
      },
    });

    await this.prisma.tableSession.update({
      where: { id: sessionId },
      data: { status: TableSessionStatus.ordered },
    });

    return this.getSession(sessionId);
  }

  async setSplit(
    sessionId: string,
    body: { splitMode: 'none' | 'by_person' | 'by_item'; guestCount?: number },
  ) {
    await this.loadSession(sessionId);
    const splitMode =
      body.splitMode === 'by_person'
        ? SplitMode.by_person
        : body.splitMode === 'by_item'
          ? SplitMode.by_item
          : SplitMode.none;

    await this.prisma.tableSession.update({
      where: { id: sessionId },
      data: {
        splitMode,
        guestCount: Math.max(1, body.guestCount ?? 1),
      },
    });

    return this.getSession(sessionId);
  }

  async createPayment(
    sessionId: string,
    body: {
      method: 'pix' | 'apple_pay' | 'google_pay' | 'card';
      amount: number;
      guestId?: string;
    },
  ) {
    await this.loadSession(sessionId);

    const methodMap: Record<string, PaymentMethod> = {
      pix: PaymentMethod.pix,
      apple_pay: PaymentMethod.apple_pay,
      google_pay: PaymentMethod.google_pay,
      card: PaymentMethod.card,
    };

    const method = methodMap[body.method];
    if (!method) throw new BadRequestException('Método inválido');

    const meta =
      method === PaymentMethod.pix
        ? {
            copiaCola: `00020126580014BR.GOV.BCB.PIX0136casa-brasa-mesa-${sessionId}520400005303986540${body.amount.toFixed(2)}5802BR5913Casa Brasa6009SAO PAULO62070503***6304ABCD`,
            mensagem: 'Pix simulado — confirme para marcar como pago',
          }
        : {
            mensagem:
              method === PaymentMethod.apple_pay
                ? 'Apple Pay (Payment Request) — fluxo web nativo simulado'
                : method === PaymentMethod.google_pay
                  ? 'Google Pay (Payment Request) — fluxo web nativo simulado'
                  : 'Cartão — fluxo simulado',
          };

    const payment = await this.prisma.payment.create({
      data: {
        sessionId,
        method,
        amount: body.amount,
        guestId: body.guestId,
        status: PaymentStatus.pending,
        meta,
      },
    });

    return {
      ...(await this.getSession(sessionId)),
      lastPaymentId: payment.id,
    };
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.paid },
    });

    const session = await this.loadSession(payment.sessionId);
    const total = session.lines.reduce(
      (sum, l) => sum + Number(l.unitPrice) * l.quantity,
      0,
    );
    const paid = session.payments
      .filter((p) => p.status === PaymentStatus.paid)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    if (paid >= total - 0.01) {
      await this.prisma.tableSession.update({
        where: { id: payment.sessionId },
        data: { status: TableSessionStatus.closed },
      });
    }

    return this.getSession(payment.sessionId);
  }
}
