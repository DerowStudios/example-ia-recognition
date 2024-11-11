import { Injectable, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import { join } from 'path';
import { Multer } from 'multer'; // Importar Multer directamente desde las definiciones de tipo
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class SpeciesService implements OnModuleInit {
  private model: tf.GraphModel | null = null;
  private classes = ['Apis Melifera', 'Bombus Terrestris', 'Danaus plexippus'];
  async onModuleInit() {
    console.log('Iniciando el módulo y cargando el modelo...');
    await this.loadModel();
    if (this.model) {
      console.log('El modelo se ha cargado y asignado correctamente');
    } else {
      console.error('El modelo no se cargó correctamente');
    }
  }

  async loadModel() {
    try {
      const modelPath = join(__dirname, '/tfjs_model/model.json');
      this.model = await tf.loadGraphModel('file://' + modelPath);
      console.log('Modelo cargado con éxito:', this.model);
    } catch (error) {
      console.error('Error cargando el modelo:', error);
      throw new Error('No se pudo cargar el modelo');
    }
  }

  async predict(
    file: Multer.File,
  ): Promise<{ index: number; class: string; value: number }[]> {
    console.log('Recibiendo imagen para predicción:', file);
    if (!this.model) {
      console.error('El modelo no está cargado');
      throw new Error('El modelo no está cargado');
    }
    try {
      const outputPath = path.join(__dirname, 'output', 'output.jpg');
      // Leer el archivo y convertirlo en un buffer
      const width = 224;
      // const height = 224;
      //configurar la saturacion para decifrar mejor las imagenes enviadas.
      // .modulate({ saturation: 5, lightness: 0.1 }) ESTA CONFIGURACION FUNCIONA PARA RECONOCER A LOS 3 BICHOS

      const imageDownload = await sharp(file.buffer)
        .modulate({ saturation: 5, lightness: 0.1 })
        .extend({
          top: 0,
          bottom: 0,
          left: (width - 130) / 2,
          right: (width - 130) / 2,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .toFile(outputPath);
      const imageBuffer = await sharp(file.buffer)
        .modulate({ saturation: 5, lightness: 0.1 })
        .extend({
          top: 0,
          bottom: 0,
          left: (width - 130) / 2,
          right: (width - 130) / 2,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .toBuffer();

      console.log('Buffer de imagen leído con éxito');
      // Convertir el buffer de la imagen en un tensor
      const imageTensor = tf.node
        .decodeImage(imageBuffer, 3)
        .resizeNearestNeighbor([224, 224])
        .expandDims(0)
        .toFloat()
        .div(tf.scalar(255));
      console.log('Imagen convertida a tensor:', imageTensor.shape);
      // Hacer la predicción
      const resizedTensor = imageTensor
        .resizeNearestNeighbor([224, 224])
        .expandDims(0)
        .toFloat()
        .div(tf.scalar(255));
      console.log('Tensor redimensionado:', resizedTensor.shape);
      const prediction = this.model.predict(imageTensor) as tf.Tensor;
      console.log('Predicción realizada:', prediction);
      const predictionArray = prediction.arraySync() as number[][];
      console.log('Array de predicción:', predictionArray);
      const results = predictionArray[0].map((value, index) => ({
        index,
        class: this.classes[index],
        value,
      }));
      // Ordenar las predicciones por valor de mayor a menor
      results.sort((a, b) => b.value - a.value);
      console.log('Resultados ordenados:', results);
      imageTensor.dispose();
      resizedTensor.dispose();
      prediction.dispose();
      return results;
    } catch (error) {
      console.error('Error en la predicción:', error);
      throw new Error('No se pudo procesar la imagen para la predicción');
    }
  }
}
