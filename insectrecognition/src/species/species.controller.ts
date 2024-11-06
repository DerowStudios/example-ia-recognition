import {
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
  ): Promise<{ index: number; class: string; value: number }[]> {
    return this.appService.predict(file);
  }
}
