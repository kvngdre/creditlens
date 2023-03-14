import { httpCodes } from '../utils/constants'
import BaseController from './base.controller'
import TenantService from '../services/tenant.service'
import tenantValidator from '../validators/tenant.validator'
import ValidationError from '../errors/ValidationError'

class TenantController extends BaseController {
  static signUp = async (req, res) => {
    const { value, error } = tenantValidator.validateSignUp(req.body)
    if (error) throw new ValidationError(null, error)

    const newTenant = await TenantService.createTenant(value)
    const response = this.apiResponse(
      'Tenant created. Check user email to complete registration.',
      newTenant
    )

    res.status(httpCodes.CREATED).json(response)
  }

  static getTenants = async (req, res) => {
    const [count, tenants] = await TenantService.getTenants()

    const message = this.getMsgFromCount(count)
    const response = this.apiResponse(message, tenants)

    res.status(httpCodes.OK).json(response)
  }

  static getTenant = async (req, res) => {
    const tenant = await TenantService.getTenant(req.params.tenantId)
    const response = this.apiResponse('Fetched tenant.', tenant)

    res.status(httpCodes.OK).json(response)
  }

  static getCurrentTenant = async (req, res) => {
    const tenant = await TenantService.getTenant(req.currentUser.tenantId)
    const response = this.apiResponse('Fetched tenant.', tenant)

    res.status(httpCodes.OK).json(response)
  }

  static updateTenant = async (req, res) => {
    const { value, error } = tenantValidator.validateUpdate(req.body)
    if (error) throw new ValidationError(null, error)

    const tenant = await TenantService.updateTenant(req.params.tenantId, value)
    const response = this.apiResponse('Tenant updated.', tenant)

    res.status(httpCodes.OK).json(response)
  }

  static deleteTenant = async (req, res) => {
    await TenantService.deleteTenant(req.params.tenantId)
    const response = this.apiResponse('Tenant deleted.')

    res.status(httpCodes.OK).json(response)
  }

  static activateTenant = async (req, res) => {
    const { value, error } = tenantValidator.validateActivate(req.body)
    if (error) throw new ValidationError(null, error)

    await TenantService.activateTenant(req.params.tenantId, value)
    const response = this.apiResponse('Tenant activated')

    res.status(httpCodes.OK).json(response)
  }

  static deactivateTenant = async (req, res) => {
    const { value, error } = tenantValidator.validateDeactivate(req.query)
    if (error) throw new ValidationError(null, error)

    await TenantService.deactivateTenant(req.currentUser, value)
    const response = this.apiResponse('Tenant deactivated')

    res.status(httpCodes.OK).json(response)
  }

  static reactivateTenant = async (req, res) => {
    const tenant = await TenantService.reactivateTenant(req.params.tenantId)
    const response = this.apiResponse('Tenant reactivated.', tenant)

    res.status(httpCodes.OK).json(response)
  }

  static generatePublicUrl = async (req, res) => {
    const publicUrl = await TenantService.generateFormId(req.params.tenantId)
    const response = this.apiResponse('Link generated.', publicUrl)

    res.status(httpCodes.OK).json(response)
  }

  static getPublicFormData = async (req, res) => {
    const formData = await TenantService.getFormData(req.params.formId)
    const response = this.apiResponse('Fetched tenant public form data.', formData)

    res.status(httpCodes.OK).json(response)
  }

  static uploadFiles = async (req, res) => {
    const tenant = await TenantService.uploadDocs(req.currentUser.tenantId, req.files)
    const response = this.apiResponse('Files uploaded.', tenant)

    res.status(httpCodes.OK).json(response)
  }

  static createConfig = async (req, res) => {
    const { value, error } = tenantValidator.validateCreateConfig(
      req.body,
      req.currentUser.tenantId
    )
    if (error) throw new ValidationError(null, error)

    const configurations = await TenantService.createConfig(value)
    const response = this.apiResponse(
      'Configurations created.',
      configurations
    )

    res.status(httpCodes.CREATED).json(response)
  }

  static getConfigs = async (_req, res) => {
    const [count, configurations] = await TenantService.getConfigs()

    const message = this.getMsgFromCount(count)
    const response = this.apiResponse(message, configurations)

    res.status(httpCodes.OK).json(response)
  }

  static getConfig = async (req, res) => {
    const tenantConfig = await TenantService.getConfig(req.params.tenantId)
    const response = this.apiResponse(
      'Fetched configurations.',
      tenantConfig
    )

    res.status(httpCodes.OK).json(response)
  }

  static updateConfig = async (req, res) => {
    const { value, error } = tenantValidator.validateUpdateConfig(req.body)
    if (error) throw new ValidationError(null, error)

    const tenantConfig = await TenantService.updateConfig(
      { tenantId: req.params.tenantId },
      value
    )
    const response = this.apiResponse(
      'Tenant configuration updated.',
      tenantConfig
    )

    res.status(httpCodes.OK).json(response)
  }

  static deleteConfig = async (req, res) => {
    await TenantService.deleteConfig({ tenantId: req.params.tenantId })
    const response = this.apiResponse('Tenant configuration deleted.')

    res.status(httpCodes.OK).json(response)
  }
}

export default TenantController
