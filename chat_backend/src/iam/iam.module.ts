import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { PasswordChangeGuard } from './guards/password-change/password-change.guard';

@Module({
  imports: [AuthModule],
  providers: [JwtAuthGuard, PasswordChangeGuard],
  exports: [JwtAuthGuard, PasswordChangeGuard],
})
export class IamModule {}
