import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthUser, CurrentUser, StaffOnly } from '../common/decorators';

@StaffOnly()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getGeneralStats(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getGeneralStats(user.clinicId!);
  }
}
