import { canUserResetPwd } from '../helpers'
import { roles } from '../config'
import BaseValidator from './base.validator'
import ForbiddenError from '../errors/ForbiddenError'
import Joi from 'joi'

class UserValidator extends BaseValidator {
  #jobTitle
  #displayNameSchema
  #segmentsSchema
  #timezoneSchema

  constructor () {
    super()

    this.#jobTitle = Joi.string().label('Job title').min(2).max(50).messages({
      'string.min': '{#label} is not valid',
      'string.max': '{#label} is too long'
    })

    this.#displayNameSchema = Joi.string()
      .label('Display name')
      .min(1)
      .max(255)
      .invalid('', ' ', '  ')

    this.#segmentsSchema = Joi.array()
      .items(this._objectIdSchema)
      .min(1)
      .messages({ 'array.min': '{#label} array cannot be empty' })
      .label('Segments')

    const supportedTimeZones = Intl.supportedValuesOf('timeZone')
    this.#timezoneSchema = Joi.string()
      .label('Timezone')
      .valid(...supportedTimeZones)
      .messages({
        'any.only': '{#label} is not supported'
      })
  }

  validateCreate = (dto, tenantId) => {
    const schema = Joi.object({
      tenantId: this._objectIdSchema.label('Tenant id').default(tenantId),
      first_name: this._nameSchema.extract('first').required(),
      last_name: this._nameSchema.extract('last').required(),
      middle_name: this._nameSchema.extract('middle'),
      job_title: this.#jobTitle,
      gender: this._genderSchema.required(),
      dob: this._dateSchema.label('Date of birth').less('now'),
      display_name: this.#displayNameSchema.default((parent) => {
        return `${parent.first_name} ${parent.last_name}`
      }),
      phone_number: this._phoneNumberSchema.required(),
      email: this._emailSchema.required(),
      role: this._roleSchema.invalid(roles.DIRECTOR).required(),
      segments: this.#segmentsSchema.when('role', {
        is: roles.AGENT,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      configurations: Joi.object({
        timezone: this.#timezoneSchema
      })
    })

    let { value, error } = schema.validate(dto, { abortEarly: false })
    error = this._refineError(error)

    return { value, error }
  }

  validateUpdate = (dto) => {
    const schema = Joi.object({
      first_name: this._nameSchema.extract('first'),
      last_name: this._nameSchema.extract('last'),
      middle_name: this._nameSchema.extract('middle'),
      job_title: this.#jobTitle,
      gender: this._genderSchema,
      dob: this._dateSchema.label('Date of birth').less('now'),
      display_name: this.#displayNameSchema,
      role: this._roleSchema.invalid(roles.DIRECTOR),
      segments: this.#segmentsSchema.when('role', {
        is: roles.AGENT,
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      }),
      configurations: Joi.object({
        timezone: this.#timezoneSchema
      })
    }).min(1)

    let { value, error } = schema.validate(dto, { abortEarly: false })
    error = this._refineError(error)

    return { value, error }
  }

  validateUpdateConfig = (dto) => {
    const schema = Joi.object({
      timezone: this.#timezoneSchema
    }).min(1)

    let { value, error } = schema.validate(dto, { abortEarly: false })
    error = this._refineError(error)

    return { value, error }
  }

  validateChangePassword = (dto) => {
    const schema = Joi.object({
      current_password: Joi.string().label('Current password').required(),
      new_password: this._passwordSchema.required(),
      confirm_password: this._confirmPasswordSchema.required()
    })

    let { value, error } = schema.validate(dto, { abortEarly: false })
    error = this._refineError(error)

    return { value, error }
  }

  validateForgotPassword = async (dto) => {
    let schema = Joi.object()
      .keys({
        email: this._emailSchema.required()
      })
      .min(1)
    let { value, error } = schema.validate(dto, { abortEarly: false })

    if (error) {
      error = this._refineError(error)
      return { value, error }
    }

    const canReset = await canUserResetPwd(value.email)
    if (!canReset) {
      throw new ForbiddenError(
        "You can't reset your own password. If you can't sign in, you need to contact your administrator to reset your password for you."
      )
    }

    schema = schema.keys({
      new_password: this._passwordSchema.required(),
      confirm_password: this._confirmPasswordSchema.required(),
      canReset: Joi.boolean().default(canReset)
    })

    const result = schema.validate(dto, { abortEarly: false })
    result.error = this._refineError(result.error)

    return result
  }
}

export default new UserValidator()
