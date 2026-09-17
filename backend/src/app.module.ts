import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StudentModule } from './student/student.module';
import { TeacherModule } from './teacher/teacher.module';
import { AcademicModule } from './academic/academic.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FinanceModule } from './finance/finance.module';
import { LmsModule } from './lms/lms.module';
import { AssignmentModule } from './assignment/assignment.module';
import { ExamModule } from './exam/exam.module';
import { NotificationModule } from './notification/notification.module';
import { CmsModule } from './cms/cms.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MediaModule } from './media/media.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AcademyModule } from './academy/academy.module';
import { UserModule } from './user/user.module';
import { BranchModule } from './branch/branch.module';
import { EmailModule } from './email/email.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import configuration from './config/configuration';

import { DepartmentModule } from './department/department.module';
import { TimetableModule } from './timetable/timetable.module';
import { PlacementModule } from './placement/placement.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [
    // Configure Global environment parameters
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    AcademyModule,
    UserModule,
    BranchModule,
    DepartmentModule,
    EmailModule,
    TeacherModule,
    StudentModule,
    AcademicModule,
    AttendanceModule,
    TimetableModule,
    FinanceModule,
    LmsModule,
    AssignmentModule,
    ExamModule,
    PlacementModule,
    LibraryModule,
    NotificationModule,
    CmsModule,
    AnalyticsModule,
    MediaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Bind application-wide logging middleware monitors
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
