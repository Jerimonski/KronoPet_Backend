import {
  Body,
  Controller,
  Get,
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
import { TutorDto } from './dto/tutor.dto';
import { TutorsService } from './tutors.service';

@StaffOnly()
@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.tutorsService.findAll(user.clinicId!);
  }

  @Post()
  create(@Body() dto: TutorDto, @CurrentUser() user: AuthUser) {
    return this.tutorsService.create(dto, actorOf(user));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TutorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tutorsService.update(id, dto, actorOf(user));
  }
}
