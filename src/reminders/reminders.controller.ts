import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  actorOf,
  AuthUser,
  CurrentUser,
  StaffOnly,
} from '../common/decorators';
import { ReminderSettingsDto, SendRemindersDto } from './dto/reminder.dto';
import { RemindersService } from './reminders.service';

@StaffOnly()
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  findLogs(@CurrentUser() user: AuthUser) {
    return this.remindersService.findLogs(user.clinicId!);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: AuthUser) {
    return this.remindersService.getSettings(user.clinicId!);
  }

  @Patch('settings')
  updateSettings(
    @Body() dto: ReminderSettingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.remindersService.updateSettings(dto, user.clinicId!);
  }

  @Post('send')
  send(@Body() dto: SendRemindersDto, @CurrentUser() user: AuthUser) {
    return this.remindersService.send(dto.reminders, actorOf(user));
  }
}
