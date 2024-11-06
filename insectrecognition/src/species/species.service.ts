import { Injectable, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import { join } from 'path';
import { Multer } from 'multer'; // Importar Multer directamente desde las definiciones de tipo
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

  // async predict(image: any): Promise<number[]> {
  //   const processedImage = tf
  //     .tensor(image)
  //     .resizeBilinear([224, 224])
  //     .expandDims(0)
  //     .div(tf.scalar(255));
  //   const predictions = this.model.predict(processedImage) as tf.Tensor;
  //   const predictionArray = [...predictions.dataSync()];
  //   return predictionArray;
  // }

  async predict(file: Multer.File): Promise<number[]> {
    if (!this.model) {
      console.error('El modelo no está cargado');
      throw new Error('El modelo no está cargado');
    }
    try {
      // Leer el archivo y convertirlo en un buffer
      const imageBuffer = file.buffer;
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
      const maxIndex = predictionArray[0].indexOf(
        Math.max(...predictionArray[0]),
      );
      const predictedClass = this.classes[maxIndex];
      console.log(`Clase predicha: ${predictedClass}`);
      // Limpiar el tensor para liberar memoria
      imageTensor.dispose();
      resizedTensor.dispose();
      prediction.dispose();
      return predictionArray[0];
    } catch (error) {
      console.error('Error en la predicción:', error);
      throw new Error('No se pudo procesar la imagen para la predicción');
    }
  }
}
