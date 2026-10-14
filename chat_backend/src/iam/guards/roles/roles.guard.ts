import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from 'src/database/prisma.service';
import { ROLES_KEY, UserRole } from 'src/iam/decorators/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('User is not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!requiredRoles.includes(user.role.name as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Сохраняем актуальную роль в запросе для последующих обработчиков.
    request.user.role = user.role.name;

    return true;
  }
}
