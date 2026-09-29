import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return {
      name: 'HYVORA Degree College EduERP API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api-docs',
      apiPrefix: '/api/v1',
      timestamp: new Date().toISOString(),
    };
  }
}
