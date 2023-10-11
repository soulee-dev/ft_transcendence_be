import { Module } from '@nestjs/common';
import { CronJobsService } from './cron-jobs.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({ providers: [CronJobsService, PrismaService] })
export class CronJobsModule {}
