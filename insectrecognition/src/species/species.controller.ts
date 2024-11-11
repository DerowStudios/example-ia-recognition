import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeciesService } from './species.service';
import { Multer } from 'multer';

@Controller()
export class SpeciesController {
  constructor(private readonly appService: SpeciesService) {}
  @Post('predict') @UseInterceptors(FileInterceptor('image')) async predict(
    @UploadedFile() file: Multer.File,
    @Body() body: any,
  ): Promise<{ index: number; class: string; value: number }[] | string> {
    console.log('este body', body);
    console.log('File received:', file); // Verifica si el archivo es recibido correctamente
    if (!file) {
      // return 'no hay archivo';
      throw new Error('No se recibió ningún archivo');
    }
    return this.appService.predict(file);
  }
}
