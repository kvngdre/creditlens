import { Schema, model } from 'mongoose'
import NotFoundError from '../errors/NotFoundError.js'

const schemaOptions = { timestamps: true, versionKey: false }

const roleSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },

    isDefault: {
      type: Boolean,
      default: false
    },

    name: {
      type: String,
      required: true
    },

    description: String,

    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission'
      }
    ]
  },
  schemaOptions
)

roleSchema.index({ name: 1, tenantId: 1 }, { unique: true })

roleSchema.post(/^find/, function(doc) {
  if (Array.isArray(doc) && doc.length === 0) {
    throw new NotFoundError('Roles not found.')
  }

  if (!doc) throw new NotFoundError('Role not found.')
})

const Role = model('Role', roleSchema)

export default Role
