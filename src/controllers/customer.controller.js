import { httpCodes } from '../utils/constants'
import BaseController from './base.controller'
import CustomerService from '../services/customer.service'
import customerValidator from '../validators/customer.validator'
import ValidationError from '../errors/ValidationError'

class CustomerController extends BaseController {
  static createCustomer = async (req, res) => {
    const { value, error } = customerValidator.validateCreate(req.body, req.currentUser.tenantId)
    if (error) throw new ValidationError(null, error)

    const newCustomer = await CustomerService.create(value)
    const response = this.apiResponse('Customer created', newCustomer)

    res.status(httpCodes.CREATED).json(response)
  }

  static getCustomers = async (req, res) => {
    const [count, customers] = await CustomerService.getCustomers(
      req.currentUser.tenantId
    )
    const message = this.getMsgFromCount(count)
    const response = this.apiResponse(message, customers)

    res.status(httpCodes.OK).json(response)
  }

  static getCustomer = async (req, res) => {
    const customer = await CustomerService.getCustomer(req.params.customerId)
    const response = this.apiResponse('Fetched customer', customer)

    res.status(httpCodes.OK).json(response)
  }

  static updateCustomer = async (req, res) => {
    const { value, error } = customerValidator.validateUpdate(req.body)
    if (error) throw new ValidationError(null, error)

    const customer = await CustomerService.updateCustomer(
      req.params.customerId,
      value
    )
    const response = this.apiResponse('Customer updated.', customer)

    res.status(httpCodes.OK).json(response)
  }

  static deleteCustomer = async (req, res) => {
    await CustomerService.deleteCustomer(req.params.customerId)
    const response = this.apiResponse('Customer deleted.')

    res.status(httpCodes.OK).json(response)
  }

  static uploadDocs = async (req, res) => {
    const customer = await CustomerService.uploadFiles(req.params.customerId, req.files)
    const response = this.apiResponse('Files uploaded', customer)

    res.status(httpCodes.OK).json(response)
  }
}

export default CustomerController
