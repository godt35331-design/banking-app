import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminMailController } from './mail.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, AdminMailController],
  providers: [AdminService],
})
export class AdminModule {}
