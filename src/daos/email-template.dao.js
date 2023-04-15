import { Error } from 'mongoose'
import BaseDAO from './base.dao.js'
import ConflictError from '../errors/ConflictError.js'
import EmailTemplate from '../models/email-template.model.js'
import ValidationError from '../errors/ValidationError.js'

class EmailTemplateDAO extends BaseDAO {
  static async insert (dto, trx) {
    try {
      const newRecord = new EmailTemplate(dto)
      await newRecord.save({ session: trx })

      return newRecord
    } catch (exception) {
      if (exception.code === this.DUPLICATE_ERROR_CODE) {
        const field = this.getDuplicateField(exception)
        throw new ConflictError(`${field} already in use.`)
      }

      if (exception instanceof Error.ValidationError) {
        const errMsg = this.getValidationErrorMsg(exception)
        throw new ValidationError(errMsg)
      }

      throw exception
    }
  }

  static async find (filter = {}, projection = {}) {
    const foundRecords = await EmailTemplate.find(filter).select(projection)

    return foundRecords
  }

  static async findById (id, projection = {}) {
    const foundRecord = await EmailTemplate.findById(id).select(projection)

    return foundRecord
  }

  static async findOne (filter, projection = {}) {
    const foundRecord = await EmailTemplate.findOne(filter).select(projection)

    return foundRecord
  }

  static async update (id, dto, projection = {}) {
    try {
      const foundRecord = await EmailTemplate.findById(id).select(projection)

      foundRecord.set(dto)
      await foundRecord.save()

      return foundRecord
    } catch (exception) {
      if (exception.code === this.DUPLICATE_ERROR_CODE) {
        const field = this.getDuplicateField(exception)
        throw new ConflictError(`${field} already in use.`)
      }

      if (exception instanceof Error.ValidationError) {
        const errMsg = this.getValidationErrorMsg(exception)
        throw new ValidationError(errMsg)
      }

      throw exception
    }
  }

  static async remove (id) {
    const deletedRecord = await EmailTemplate.findByIdAndDelete(id)

    return deletedRecord
  }
}

export default EmailTemplateDAO
