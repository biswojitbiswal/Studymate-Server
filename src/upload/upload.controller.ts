import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinary: CloudinaryService) {}

//   @Post('icon')
//   @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1024 * 1024 * 2 } })) // 2MB
// //   async uploadIcon(@UploadedFile() file: Express.Multer.File) {
//     if (!file) throw new BadRequestException('No file provided');
//     // optional: validate mimetype startsWith('image/')
//     // const result = await this.cloudinary.uploadBuffer(file.buffer, 'studymate/icons');
//     // return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height };
//   }
}
