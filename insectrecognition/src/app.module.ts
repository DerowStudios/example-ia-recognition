import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { SpeciesModule } from './species/species.module';

@Module({
  imports: [DatabaseModule, SpeciesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
