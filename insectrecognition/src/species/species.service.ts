import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Species } from './schemas/species.schema';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SpeciesService {
  private readonly iNaturalistApiUrl =
    'https://api.inaturalist.org/v1/observations';

  constructor(
    @InjectModel(Species.name) private speciesModel: Model<Species>,
    private httpService: HttpService,
  ) {}

  async fetchAndSaveSpecies() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.iNaturalistApiUrl, {
          params: {
            taxon_id: 'your_taxon_id_for_bees', // Taxon específico para abejas y abejorros
            per_page: 50,
          },
        }),
      );

      const observations = response.data.results;
      for (const obs of observations) {
        const newSpecies = new this.speciesModel({
          name: obs.species_guess,
          taxonId: obs.taxon_id,
          description: obs.description,
          imageUrl: obs.photos[0]?.url,
        });
        await newSpecies.save();
      }
    } catch (error) {
      console.error('Error al descargar y guardar datos:', error);
    }
  }
}
