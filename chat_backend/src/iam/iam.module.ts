import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { PasswordChangeGuard } from './guards/password-change/password-change.guard';
import { RolesGuard } from './guards/roles/roles.guard';

@Module({
  imports: [AuthModule],
  providers: [JwtAuthGuard, PasswordChangeGuard, RolesGuard],
  exports: [JwtAuthGuard, PasswordChangeGuard, RolesGuard],
})
export class IamModule {}
