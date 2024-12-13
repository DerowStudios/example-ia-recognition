import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(
    username: string,
    password: string,
    avatar?: string,
  ): Promise<User> {
    try {
      const existingUser = await this.userModel.findOne({ username });
      if (existingUser) {
        throw new BadRequestException('Username already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new this.userModel({
        username,
        password: hashedPassword,
        avatar,
      });

      return await newUser.save();
    } catch (error) {
      // Si es un error conocido, lo lanzamos como está
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Si es un error inesperado, lanzamos una excepción general
      throw new InternalServerErrorException(
        'An error occurred while creating the user',
      );
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      return await this.userModel.findOne({ username });
    } catch (error) {
      throw new InternalServerErrorException(
        error,
        'An error occurred while retrieving the user',
      );
    }
  }

  async validateUser(username: string, password: string): Promise<User> {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid password');
      }

      return user;
    } catch (error) {
      throw new InternalServerErrorException(
        error,
        'An error occurred while validating the user',
      );
    }
  }
}
