import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { toStaff } from '../common/mappers';
import { PLATFORM_ROLE } from '../common/decorators';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { clinicId, email, password, name, rut, phone, address } =
      registerDto;

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new BadRequestException('La clínica no existe');
    }

    const tutorExists = await this.prisma.tutor.findFirst({
      where: { OR: [{ email }, { rut }] },
    });
    if (tutorExists) {
      throw new BadRequestException(
        'Ya existe un tutor registrado con ese correo o RUT',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const tutor = await this.prisma.tutor.create({
      data: { clinicId, email, passwordHash, name, rut, phone, address },
    });

    const { passwordHash: _, ...tutorWithoutPassword } = tutor;

    return tutorWithoutPassword;
  }

  // Login de tutores (app móvil)
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const tutor = await this.prisma.tutor.findUnique({
      where: { email },
      include: { clinic: { select: { id: true, name: true } } },
    });
    // Un tutor creado por la clínica puede no tener contraseña aún
    if (!tutor?.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, tutor.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: tutor.id, email: tutor.email, role: 'tutor' };
    const { passwordHash: _, clinic, ...tutorWithoutPassword } = tutor;

    return {
      user: tutorWithoutPassword,
      // La app muestra la clínica del tutor en su perfil y en el carnet
      clinic,
      backendToken: this.jwtService.sign(payload),
    };
  }

  // Login del personal de la clínica (sistema de escritorio)
  async staffLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Mismo mensaje si falla el correo o la contraseña: no revela qué cuentas existen
    const staff = await this.prisma.staffUser.findUnique({
      where: { email: email.trim() },
      include: { clinic: { select: { id: true, name: true } } },
    });
    if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (!staff.active) {
      throw new ForbiddenException(
        'Tu cuenta está deshabilitada. Contacta al administrador de la clínica.',
      );
    }

    const payload = { sub: staff.id, email: staff.email, role: staff.role };

    return {
      user: toStaff(staff),
      clinic: staff.clinic,
      backendToken: this.jwtService.sign(payload),
    };
  }

  // Login de la cuenta de la plataforma (panel que da de alta clínicas)
  async platformLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email: email.trim() },
    });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    if (!admin.active) {
      throw new ForbiddenException('Tu cuenta está deshabilitada.');
    }

    const payload = { sub: admin.id, email: admin.email, role: PLATFORM_ROLE };

    return {
      user: { id: admin.id, name: admin.name, email: admin.email },
      backendToken: this.jwtService.sign(payload),
    };
  }

  async me(staffId: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: staffId },
    });
    if (!staff) {
      throw new NotFoundException('El usuario no existe.');
    }
    return toStaff(staff);
  }

  async findAllTutorsWithPets(clinicId: string) {
    return this.prisma.tutor.findMany({
      where: { clinicId },
      omit: { passwordHash: true },
      include: {
        pets: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
