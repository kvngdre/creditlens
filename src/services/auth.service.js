/* eslint-disable camelcase */
import { constants } from '../config'
import BadRequestError from '../errors/BadRequestError'
import events from '../pubsub/events'
import ForbiddenError from '../errors/ForbiddenError'
import generateOTP from '../utils/generateOTP'
import jwt from 'jsonwebtoken'
import logger from '../utils/logger'
import mailer from '../utils/mailer'
import pubsub from '../pubsub/PubSub'
import similarity from '../utils/similarity'
import UnauthorizedError from '../errors/UnauthorizedError'
import UserDAO from '../daos/user.dao'
import ValidationError from '../errors/ValidationError'
import UserService from './user.service'
import ConflictError from '../errors/ConflictError'

class AuthService {
  static async verifySignUp (verifyRegDto, token) {
    const { email, otp, current_password, new_password } = verifyRegDto

    const foundUser = await UserService.findByField({ email })
    if (foundUser.active) {
      throw new ConflictError('User has been verified, please sign in.')
    }

    const isMatch = foundUser.comparePasswords(current_password)
    if (!isMatch) throw new UnauthorizedError('Password is incorrect.')

    validateOTP(foundUser, otp)
    function validateOTP (user, otp) {
      if (Date.now() > user.otp.expires) {
        throw new BadRequestError('OTP expired.')
      }

      if (otp !== user.otp.pin) {
        throw new UnauthorizedError('Invalid OTP.')
      }
    }

    // * Measuring similarity of new password to the current password.
    const percentageSimilarity =
      similarity(new_password, current_password) * 100
    const similarityThreshold = constants.max_similarity
    if (percentageSimilarity >= similarityThreshold) {
      throw new ValidationError('Password is too similar to old password.')
    }

    if (token) {
      // ! Prune user refresh tokens array for expired tokens.
      foundUser.refreshTokens = foundUser.refreshTokens.filter(
        (rt) => rt.token !== token && Date.now() < rt.expires
      )
    }
    // * Generating new token set.
    const accessToken = foundUser.generateAccessToken()
    const refreshToken = foundUser.generateRefreshToken()

    foundUser.refreshTokens.push(refreshToken)
    foundUser.set({
      isEmailVerified: true,
      password: new_password,
      'otp.pin': null,
      'otp.expires': null,
      active: true,
      resetPwd: false
    })
    await foundUser.save()

    // ! Emitting user login event.
    pubsub.publish(events.user.login, { userId: foundUser._doc._id })

    delete foundUser._doc.password
    delete foundUser._doc.otp
    delete foundUser._doc.refreshTokens

    return [accessToken, refreshToken, foundUser]
  }

  static async login ({ email, password }, token) {
    const foundUser = await UserDAO.findByField({ email })

    const isMatch = await foundUser.comparePasswords(password)
    if (!isMatch) throw new UnauthorizedError('Invalid credentials.')

    permitLogin(foundUser)
    function permitLogin (user) {
      const data = {
        email: user.email,
        accessToken: null,
        redirect: {}
      }
      if (!user.isEmailVerified && !user.active) {
        data.redirect.verify_registration = true
        throw new ForbiddenError('Your account has not been confirmed.', data)
      }

      if (!user.isEmailVerified && !user.active) {
        data.redirect.reset_password = true
        throw new ForbiddenError(
          'Your password reset has been triggered.',
          data
        )
      }

      if (!user.active) {
        data.redirect = null
        throw new ForbiddenError(
          'Account deactivated. Contact your administrator.',
          data
        )
      }
    }

    if (token) {
      // ! Prune user refresh tokens array for expired tokens.
      foundUser.refreshTokens = foundUser.refreshTokens.filter(
        (rt) => rt.token !== token && Date.now() < rt.expires
      )

      /**
       * * Scenario simulated here:
       * * 1) User logs in, never uses the refresh token and does not logout.
       * * 2) The refresh token gets stolen
       * * 3) if 1 & 2, reuse detection is needed to clear all RTs when user logs in.
       */
      await UserDAO.findByField({
        refreshTokens: { $elemMatch: { token } }
      }).catch(() => {
        /**
         * ! Refresh token reuse detected.
         * * Purge user refresh token array.
         */
        foundUser.set({ refreshTokens: [] })
      })
    }

    // * Generating new token set.
    const accessToken = foundUser.generateAccessToken()
    const refreshToken = foundUser.generateRefreshToken()

    foundUser.refreshTokens.push(refreshToken)
    await foundUser.save()

    // * Emitting user login event.
    pubsub.publish(events.user.login, { userId: foundUser._doc._id })

    return [
      { email, role: foundUser.role, accessToken, redirect: null },
      refreshToken
    ]
  }

  static async getCurrentUser (userId) {
    const foundUser = await UserService.getUserById(userId)

    return foundUser
  }

  static async getNewTokenSet (token) {
    try {
      const foundUser = await UserDAO.findByField({
        refreshTokens: { $elemMatch: { token } }
      })
      const { id, iss, aud } = jwt.verify(token, constants.jwt.secret.refresh)
      const { issuer, audience } = constants.jwt
      if (
        // Validating token
        id !== foundUser._id.toString() ||
        iss !== issuer ||
        aud !== audience
      ) {
        throw new ForbiddenError('Invalid token')
      }

      // Generate new token set
      const accessToken = foundUser.generateAccessToken()
      const refreshToken = foundUser.generateRefreshToken()

      // ! Prune refresh token array for expired refresh tokens.
      foundUser.refreshTokens = foundUser.refreshTokens.filter(
        (rt) => rt.token !== token && Date.now() < rt.expires
      )

      // Updating user refresh token array
      foundUser.refreshTokens.push(refreshToken)
      await foundUser.save()

      return { accessToken, refreshToken }
    } catch (exception) {
      const decoded = jwt.verify(token, constants.jwt.secret.refresh)
      UserDAO.findById(decoded.id)
        .then(async (foundUser) => {
          await foundUser.updateOne({ refreshTokens: [] })
        })
        .catch(() => {})
    }
  }

  static async sendOTP ({ email }) {
    const foundUser = await UserDAO.findByField({ email })

    const generatedOTP = generateOTP()
    foundUser.set({ otp: generatedOTP })
    await foundUser.save()

    logger.info('Sending OTP mail...')
    await mailer({
      to: email,
      subject: 'Your one-time-pin request',
      name: foundUser.name.first,
      template: 'otp-request',
      payload: { otp: generatedOTP.pin }
    })
  }

  static async logout (token) {
    try {
      const foundUser = await UserDAO.findByField({
        refreshTokens: { $elemMatch: { token } }
      })

      foundUser.refreshTokens = foundUser.refreshTokens.filter(
        (rt) => rt.token !== token && Date.now() < rt.expires
      )
      await foundUser.save()

      return [200, 'User logged out']
    } catch (exception) {
      return [204, null]
    }
  }

  static async logoutAllSessions (userId, token) {
    const foundUser = await UserService.getUserById(userId)

    // ! Prune refresh token array for expired refresh tokens.
    foundUser.refreshTokens = foundUser.refreshTokens.filter(
      (rt) => rt.token !== token
    )
    await foundUser.save()

    return foundUser
  }
}

export default AuthService
