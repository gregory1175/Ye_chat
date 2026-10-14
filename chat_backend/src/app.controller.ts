import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';

import { AppService } from './app.service';
import { JwtAuthGuard } from './iam/guards/jwt-auth/jwt-auth.guard';
import { PasswordChangeGuard } from './iam/guards/password-change/password-change.guard';
import { Roles } from './iam/decorators/roles.decorator';
import { RolesGuard } from './iam/guards/roles/roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
  };
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth-test')
  @UseGuards(JwtAuthGuard, PasswordChangeGuard)
  authTest(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Access granted',
      userId: req.user.sub,
      role: req.user.role,
    };
  }

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, PasswordChangeGuard, RolesGuard)
  @Roles('ADMIN')
  adminTest(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Admin access granted',
      userId: req.user.sub,
      role: req.user.role,
    };
  }
}
