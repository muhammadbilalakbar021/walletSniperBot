import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '../../../../config/config.service';

@Injectable()
export class S3Service {
  private s3Instance: S3;
  constructor(private readonly configService: ConfigService) {
    this.s3Instance = new S3({
      accessKeyId: this.configService.AWS_ACCESS_KEY,
      secretAccessKey: this.configService.AWS_SECRET_KEY,
      region: this.configService.AWS_REGION,
    });
  }

  async uploadPublicFile(
    dataBuffer: any,
    filename: string,
    contentType: string,
  ) {
    let result = await this.s3Instance
      .upload({
        Bucket: this.configService.AWS_BUCKET,
        Body: dataBuffer,
        Key: `public_images/${uuid()}-${filename}`,
        ContentType: contentType,
      })
      .promise();
    return {
      key: result.Key,
      url: result.Location,
    };
  }
}
