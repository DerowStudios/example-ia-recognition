import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Species } from './schemas/species.schema';
import { firstValueFrom } from 'rxjs';
import * as tf from '@tensorflow/tfjs';
import { createCanvas, loadImage } from 'canvas';

@Injectable()
export class SpeciesService {
  private readonly iNaturalistApiUrl =
    'https://api.inaturalist.org/v1/observations';

  constructor(
    @InjectModel(Species.name) private speciesModel: Model<Species>,
    private httpService: HttpService,
  ) {}

  async getTaxonIdByName(name: string): Promise<number> {
    const response = await firstValueFrom(
      this.httpService.get('https://api.inaturalist.org/v1/taxa', {
        params: { q: name },
      }),
    );
    const taxon = response.data.results[0];
    return taxon ? taxon.id : null;
  }

  async fetchAndTrainSpeciesModel(taxonName: string) {
    try {
      const taxonId = await this.getTaxonIdByName(taxonName);
      if (!taxonId) {
        throw new Error(`No se encontró el taxon_id para: ${taxonName}`);
      }
      const response = await firstValueFrom(
        this.httpService.get(this.iNaturalistApiUrl, {
          params: { taxon_id: taxonId, per_page: 50 },
        }),
      );
      const observations = response.data.results;
      const images: tf.Tensor[] = [];
      const labels: number[] = [];
      console.log(`Número de observaciones: ${observations.length}`);

      for (const obs of observations) {
        console.log(`Procesando observación: ${obs.id}`);
        if (obs.taxon.ancestor_ids.includes(taxonId) && obs.photos.length > 0) {
          const photo = obs.photos[0];
          const imageUrl = `https://inaturalist-open-data.s3.amazonaws.com/photos/${photo.id}/medium.jpg`;
          console.log(`Descargando imagen: ${imageUrl}`);
          const image = await this.downloadAndPreprocessImage(imageUrl);
          if (image) {
            images.push(image);
            labels.push(obs.taxon.id);
          } else {
            console.warn(
              `No se pudo descargar o procesar la imagen: ${imageUrl}`,
            );
          }
        } else {
          console.warn(
            `Observación ${obs.id} no tiene fotos o no es del taxón deseado`,
          );
        }
      }
      console.log(`Número de imágenes válidas: ${images.length}`);
      if (images.length === 0) {
        throw new Error(
          'No se encontraron imágenes válidas para entrenar el modelo',
        );
      }
      await this.trainModel(images, labels);
    } catch (error) {
      console.error('Error al descargar y procesar datos:', error);
    }
  }

  async downloadAndPreprocessImage(url: string): Promise<tf.Tensor | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { responseType: 'arraybuffer' }),
      );
      if (response.status === 404) {
        console.warn(`Imagen no encontrada: ${url}`);
        return null;
      }
      const buffer = Buffer.from(response.data);
      const img = await loadImage(buffer);
      const canvas = createCanvas(128, 128); // Cambiado a 128x128
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 128, 128); // Ajustado a 128x128
      const imageData = ctx.getImageData(0, 0, 128, 128);
      const { data, width, height } = imageData;
      const dataArray = new Uint8Array(data.buffer);
      // Filtrar el canal alfa
      const rgbArray = [];
      for (let i = 0; i < dataArray.length; i += 4) {
        rgbArray.push(dataArray[i], dataArray[i + 1], dataArray[i + 2]);
      }
      return tf.tensor3d(rgbArray, [height, width, 3]);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn(`Imagen no encontrada: ${url}`);
      } else {
        console.error(`Error al descargar o procesar la imagen: ${url}`, error);
      }
      return null;
    }
  }

  async trainModel(images: tf.Tensor[], labels: number[]) {
    try {
      console.log(
        `Entrenando modelo con ${images.length} imágenes y ${labels.length} etiquetas`,
      );
      const imageTensor = tf.stack(images);
      console.log('Tensor de imágenes creado.');
      const labelTensor = tf.tensor1d(labels, 'int32').toFloat();
      console.log('Tensor de etiquetas creado.');

      // Carga el modelo preentrenado MobileNet desde tfjs
      const mobilenetModel = await tf.loadLayersModel(
        'https://tfhub.dev/google/imagenet/mobilenet_v2_100_128/classification/4', // Cambiado a 128x128
      );
      console.log('Modelo MobileNet cargado.');

      // Congela las capas que no necesitas entrenar
      mobilenetModel.layers.forEach((layer) => {
        layer.trainable = false;
      });

      // Usar el modelo MobileNet directamente
      const model = tf.sequential();
      model.add(mobilenetModel);

      // Añade capas personalizadas después de MobileNet
      model.add(tf.layers.flatten());
      model.add(tf.layers.dense({ units: 100, activation: 'softmax' }));

      model.compile({
        optimizer: 'adam',
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy'],
      });
      console.log('Modelo compilado.');

      // Procesar las imágenes en lotes
      const BATCH_SIZE = 10; // Ajusta el tamaño del lote según sea necesario
      for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batchImages = images.slice(i, i + BATCH_SIZE);
        const batchLabels = labels.slice(i, i + BATCH_SIZE);
        const batchImageTensor = tf.stack(batchImages);
        const batchLabelTensor = tf.tensor1d(batchLabels, 'int32').toFloat();

        await model.fit(batchImageTensor, batchLabelTensor, {
          epochs: 1, // Entrenamiento por lote
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              console.log(
                `Batch Epoch ${epoch + 1}: loss = ${logs.loss}, accuracy = ${logs.acc}`,
              );
            },
          },
        });

        // Liberar memoria
        batchImageTensor.dispose();
        batchLabelTensor.dispose();
      }

      console.log('Modelo entrenado.');
      await model.save('file://./my_model');
      console.log('Modelo guardado en ./my_model');
    } catch (error) {
      console.error(
        'Error durante el entrenamiento o guardado del modelo:',
        error,
      );
    } finally {
      // Liberar los tensores que ya no son necesarios
      tf.dispose(images);
      tf.dispose(labels);
    }
  }
}
