import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const employees = await this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        login: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
        profile: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            nickname: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return employees.map(({ role, ...employee }) => ({
      ...employee,
      role: role.name,
    }));
  }

  async findOne(id: string) {
    const employee = await this.prisma.user.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        login: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
        profile: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            nickname: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const { role, ...employeeData } = employee;

    return {
      ...employeeData,
      role: role.name,
    };
  }

  async create(dto: CreateEmployeeDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        login: dto.login,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('Login is already taken');
    }

    const passwordHash = await argon2.hash(dto.password);

    try {
      const employee = await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.findUnique({
          where: {
            name: dto.role,
          },
          select: {
            id: true,
          },
        });

        if (!role) {
          throw new BadRequestException('Role does not exist');
        }

        return tx.user.create({
          data: {
            login: dto.login,
            passwordHash,
            roleId: role.id,
            mustChangePassword: true,
            profile: {
              create: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                middleName: dto.middleName,
                nickname: dto.nickname,
                email: dto.email,
                phone: dto.phone,
              },
            },
          },
          select: {
            id: true,
            login: true,
            isActive: true,
            mustChangePassword: true,
            createdAt: true,
            role: {
              select: {
                name: true,
              },
            },
            profile: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
                nickname: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        });
      });

      const { role, ...employeeData } = employee;

      return {
        ...employeeData,
        role: role.name,
      };
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Login is already taken');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateEmployeeDto, currentUserId: string) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        profile: {
          select: { id: true },
        },
      },
    });
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        isActive: true,
        role: { select: { name: true } },
      },
    });

    if (!currentUser || !currentUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (currentUser.role.name !== 'ADMIN' && currentUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    if (!employee || !employee.profile) {
      throw new NotFoundException('Employee not found');
    }

    const profile = await this.prisma.employeeProfile.update({
      where: { userId: id },
      data: {
        ...(dto.firstName !== undefined && {
          firstName: dto.firstName,
        }),
        ...(dto.lastName !== undefined && {
          lastName: dto.lastName,
        }),
        ...(dto.middleName !== undefined && {
          middleName: dto.middleName,
        }),
        ...(dto.nickname !== undefined && {
          nickname: dto.nickname,
        }),
        ...(dto.email !== undefined && {
          email: dto.email,
        }),
        ...(dto.phone !== undefined && {
          phone: dto.phone,
        }),
      },
      select: {
        firstName: true,
        lastName: true,
        middleName: true,
        nickname: true,
        email: true,
        phone: true,
        avatar: true,
      },
    });

    return {
      id: employee.id,
      profile,
    };
  }

  async updateStatus(id: string, isActive: boolean) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedEmployee = await tx.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          login: true,
          isActive: true,
        },
      });

      if (!isActive) {
        await tx.refreshToken.deleteMany({
          where: { userId: id },
        });
      }

      return updatedEmployee;
    });
  }

  async resetPassword(id: string, newPassword: string) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: id },
      }),
    ]);

    return {
      message: 'Password reset successfully',
      mustChangePassword: true,
    };
  }
}
