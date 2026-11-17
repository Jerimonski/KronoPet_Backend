import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser, PlatformOnly } from '../common/decorators';
import { ClinicDataDto, CreateClinicDto } from './dto/clinic.dto';
import { PlatformService } from './platform.service';

@PlatformOnly()
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('clinics')
  findClinics() {
    return this.platformService.findClinics();
  }

  @Post('clinics')
  createClinic(@Body() dto: CreateClinicDto, @CurrentUser() user: AuthUser) {
    return this.platformService.createClinic(dto, user.sub);
  }

  @Patch('clinics/:id')
  updateClinic(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClinicDataDto,
  ) {
    return this.platformService.updateClinic(id, dto);
  }

  @Delete('clinics/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeClinic(@Param('id', ParseUUIDPipe) id: string) {
    await this.platformService.removeClinic(id);
  }
}
