import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Species extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  taxonId: number;

  @Prop()
  description: string;

  @Prop()
  imageUrl: string;
}

export const SpeciesSchema = SchemaFactory.createForClass(Species);
