import { Controller, Get, Query } from '@nestjs/common';
import { SpeciesService } from './species.service';

@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get('train')
  async trainModel(@Query('taxon') taxon: string) {
    await this.speciesService.fetchAndTrainSpeciesModel(taxon);
    return 'Modelo entrenado con éxito!';
  }
}
