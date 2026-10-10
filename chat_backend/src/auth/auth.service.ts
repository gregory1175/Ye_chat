import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
      include: {
        role: true,
        profile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const passwordIsValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role.name,
    });

    const refreshToken = randomBytes(64).toString('base64url');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        login: user.login,
        role: user.role.name,
        profile: user.profile,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = createHash('sha256')
      .update(dto.refreshToken)
      .digest('hex');

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    const now = new Date();

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= now ||
      !storedToken.user.isActive
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: storedToken.user.id,
      role: storedToken.user.role.name,
    });

    const refreshToken = randomBytes(64).toString('base64url');

    const newTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.$transaction(async (tx) => {
      // Атомарно удаляем старый токен, если он ещё действителен.
      const deleted = await tx.refreshToken.deleteMany({
        where: {
          id: storedToken.id,
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
      });

      if (deleted.count !== 1) {
        throw new UnauthorizedException('Refresh token has already been used');
      }

      // Сохраняем новый refresh-токен в рамках той же транзакции.
      await tx.refreshToken.create({
        data: {
          userId: storedToken.userId,
          tokenHash: newTokenHash,
          expiresAt,
        },
      });
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(dto: RefreshTokenDto) {
    const tokenHash = createHash('sha256')
      .update(dto.refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });

    return {
      message: 'Logged out',
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
        profile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      login: user.login,
      role: user.role.name,
      profile: user.profile,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const passwordIsValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new UnauthorizedException(
        'New password must differ from current password',
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return {
      message: 'Password changed successfully',
    };
  }
}
