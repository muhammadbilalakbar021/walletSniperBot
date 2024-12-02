import { Module } from '@nestjs/common';
import { S3Service } from './service/s3.service';
@Module({
  imports: [],
  exports: [S3Service],
  providers: [S3Service],
})
export class S3StorageModule {}
