import { Controller, Post } from '@nestjs/common';

@Controller('upload')
export class UploadController {
  @Post('image')
  uploadImage() {
    return { url: `/uploads/image-${Date.now()}.png` };
  }
}
