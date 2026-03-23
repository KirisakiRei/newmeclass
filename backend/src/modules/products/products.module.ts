import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
