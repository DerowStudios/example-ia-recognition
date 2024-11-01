import { Controller, Get } from '@nestjs/common';
import { SpeciesService } from './species.service';

@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get('fetch')
  async fetchAndSaveSpecies() {
    await this.speciesService.fetchAndSaveSpecies();
    return { message: 'Datos descargados y guardados exitosamente' };
  }
}
