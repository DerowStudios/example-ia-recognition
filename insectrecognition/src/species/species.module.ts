import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { SpeciesService } from './species.service';
import { SpeciesController } from './species.controller';
import { Species, SpeciesSchema } from './schemas/species.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Species.name, schema: SpeciesSchema }]),
    HttpModule, // Importa HttpModule para HttpService
  ],
  providers: [SpeciesService],
  controllers: [SpeciesController],
})
export class SpeciesModule {}
