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
import {
  actorOf,
  AuthUser,
  CurrentUser,
  StaffOnly,
} from '../common/decorators';
import { VaccineDto } from './dto/vaccine.dto';
import { VaccinesService } from './vaccines.service';

@StaffOnly()
@Controller('vaccines')
export class VaccinesController {
  constructor(private readonly vaccinesService: VaccinesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.vaccinesService.findAll(user.clinicId!);
  }

  @Post()
  create(@Body() dto: VaccineDto, @CurrentUser() user: AuthUser) {
    return this.vaccinesService.create(dto, actorOf(user));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VaccineDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vaccinesService.update(id, dto, actorOf(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vaccinesService.remove(id, actorOf(user));
  }
}
