import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser, Public, StaffOnly } from '../common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('staff/login')
  @HttpCode(HttpStatus.OK)
  staffLogin(@Body() loginDto: LoginDto) {
    return this.authService.staffLogin(loginDto);
  }

  @Public()
  @Post('platform/login')
  @HttpCode(HttpStatus.OK)
  platformLogin(@Body() loginDto: LoginDto) {
    return this.authService.platformLogin(loginDto);
  }

  // Sesión vigente del panel: el frontend la consulta al recargar
  @StaffOnly()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.sub);
  }

  @StaffOnly()
  @Get('tutors')
  getAllTutors(@CurrentUser() user: AuthUser) {
    return this.authService.findAllTutorsWithPets(user.clinicId!);
  }
}
