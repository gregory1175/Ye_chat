import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

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
}
