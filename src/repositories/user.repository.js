import { Error } from 'mongoose';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/index.js';
import { User } from '../models/user.model.js';
import { getDuplicateField } from './lib/get-duplicate-field.js';
import { getValidationErrorMessage } from './lib/get-validation-error-message.js';

class UserRepository {
  async save(createUserDto, session) {
    try {
      const user = new User(createUserDto);
      user.save({ session });

      return user;
    } catch (exception) {
      if (exception.message.includes('E11000')) {
        const field = getDuplicateField(exception);
        throw new ConflictError(`${field} already in use.`);
      }

      if (exception instanceof Error.ValidationError) {
        const errorMessage = getValidationErrorMessage(exception);
        throw new ValidationError(errorMessage);
      }

      throw exception;
    }
  }

  async find(filter = {}, projection = {}, sortOrder = { first_name: 1 }) {
    return User.find(filter).select(projection).sort(sortOrder);
  }

  async findById(id, projection = {}) {
    return User.findById(id).select(projection).populate({ path: 'role' });
  }

  async findOne(filter, projection = {}) {
    return User.findOne(filter).select(projection).populate({ path: 'role' });
  }

  async updateOne(id, updateUserDto, projection = {}) {
    try {
      const foundUser = await User.findById(id).select(projection);
      if (!foundUser) {
        throw new NotFoundError('User does not exist');
      }

      foundUser.set(updateUserDto);
      foundUser.save();

      return foundUser;
    } catch (exception) {
      if (exception.message.includes('E11000')) {
        const field = getDuplicateField(exception);
        throw new ConflictError(`${field} already in use.`);
      }

      if (exception instanceof Error.ValidationError) {
        const errMsg = getValidationErrorMessage(exception);
        throw new ValidationError(errMsg);
      }

      throw exception;
    }
  }

  async updateMany(filter, dto) {
    return User.updateMany(filter, dto);
  }

  async remove(id) {
    User.deleteOne({ _id: id });
  }
}

export const userRepository = new UserRepository();
