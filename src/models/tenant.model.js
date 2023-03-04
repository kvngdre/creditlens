import { companyCategory } from '../utils/constants'
import { Schema, model } from 'mongoose'
import NotFoundError from '../errors/NotFoundError'
import jwt from 'jsonwebtoken'
import { constants } from '../config'

const schemaOptions = { timestamps: true, versionKey: false }

const tenantSchema = new Schema(
  {
    logo: {
      type: String,
      default: null
    },

    company_name: {
      type: String,
      unique: true,
      trim: true,
      required: true
    },

    location: {
      address: {
        type: String,
        trim: true,
        default: null
      },
      lga: {
        type: String,
        default: null
      },
      state: {
        type: String,
        default: null
      }
    },

    cac_number: {
      type: String,
      unique: true,
      sparse: true
    },

    directors: [
      {
        name: {
          type: String,
          trim: true
        },
        email: {
          type: String,
          trim: true
        },
        id: {
          type: String,
          trim: true
        }
      }
    ],

    category: {
      type: String,
      enum: companyCategory
    },

    phone_number: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },

    isEmailVerified: {
      type: Boolean,
      default: false
    },

    active: {
      type: Boolean,
      default: true
    },

    activated: {
      type: Boolean,
      default: false
    }
  },
  schemaOptions
)

tenantSchema.methods.generateFormToken = function () {
  return jwt.sign(
    {
      id: this._id.toString()
    },
    constants.jwt.secret.form,
    {
      audience: constants.jwt.audience,
      expiresIn: constants.jwt.exp_time.form,
      issuer: constants.jwt.issuer
    }
  )
}

tenantSchema.post(/^find/, function (doc) {
  if (Array.isArray(doc) && doc.length === 0) {
    throw new NotFoundError('Tenants not found.')
  }

  if (!doc) throw new NotFoundError('Tenant not found.')
})

const Tenant = model('Tenant', tenantSchema)

export default Tenant
