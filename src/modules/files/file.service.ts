import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FilesService {
  private s3: S3;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', '');

    this.s3 = new S3({
      region: this.config.get<string>('S3_REGION', ''),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  /**
   * Uploads a file to S3
   */
  async uploadToS3(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const key = `uploads/${uuid()}.${ext}`;

    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    return `https://${this.bucket}.s3.${this.config.get('S3_REGION')}.amazonaws.com/${key}`;
  }
}
