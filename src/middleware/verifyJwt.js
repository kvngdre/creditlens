import { constants } from '../config/index.js'
import { httpCodes } from '../utils/common.js'
import BaseError from '../errors/BaseError.js'
import ErrorResponse from '../utils/ErrorResponse.js'
import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'

export default async function verifyJWT (req, res, next) {
  try {
    /**
     * We are assuming that the JWT will come in a header with the form
     * Authorization: Bearer ${JWT}
     *
     */
    const getTokenFromHeader = (req) => {
      if (!req.headers?.authorization) {
        return res.status(httpCodes.BAD_REQUEST).json(
          new ErrorResponse({
            name: 'Validation Error',
            message: 'No token provided.'
          })
        )
      }

      return req.headers.authorization.split(' ')
    }

    const [scheme, token] = getTokenFromHeader(req)
    const decoded = jwt.verify(token, constants.jwt.secret.access)

    // Checking if token claims are valid.
    if (scheme !== 'Bearer' || decoded.iss !== constants.jwt.issuer) {
      return res.status(httpCodes.UNAUTHORIZED).json(
        new ErrorResponse({
          name: 'Auth Error',
          message: 'Invalid access token provided.'
        })
      )
    }

    // Checking if user is inactive.
    // TODO: Move this to redis
    const user = await User.findById(decoded.id)
      .populate({ path: 'role', populate: { path: 'permissions' } })
      .exec()
      .catch((error) => {
        if (error instanceof BaseError) {
          return res.status(httpCodes.NOT_FOUND).json(
            new ErrorResponse({
              name: 'Not Found Error',
              message: 'User not found.'
            })
          )
        }
        throw error
      })

    if (!user.active) {
      return res.status(httpCodes.FORBIDDEN).json(
        new ErrorResponse({
          name: 'Auth Error',
          message: 'Account deactivated. Contact administrator.'
        })
      )
    }

    req.currentUser = user._doc

    next()
  } catch (exception) {
    if (exception instanceof BaseError) {
      throw exception
    }

    res.status(httpCodes.FORBIDDEN).json(
      new ErrorResponse({
        name: 'Auth Error',
        message: exception.message
      })
    )
  }
}
