import TransactionDAO from '../daos/transaction.dao'
import events from '../pubsub/events'
import pubsub from '../pubsub'

class TransactionService {
  constructor () {
    pubsub.subscribe(events.wallet.credit, this.createTxn)
    pubsub.subscribe(events.wallet.debit, this.createTxn)
  }

  async createTxn (dto) {
    const newTransaction = await TransactionDAO.insert(dto)
    return newTransaction
  }

  async getTxns (tenantId) {
    const foundTransactions = await TransactionDAO.findAll({ tenantId })
    const count = Intl.NumberFormat('en-US').format(foundTransactions.length)

    return [count, foundTransactions]
  }

  async getTxn (txnId) {
    const foundTransaction = await TransactionDAO.findById(txnId)
    return foundTransaction
  }

  async updateTxn (filter, dto) {
    const updatedTransaction = await TransactionDAO.update(filter, dto)
    return updatedTransaction
  }

  async deleteTxn (id) {
    const deletedTransaction = await TransactionDAO.remove(id)
    return deletedTransaction
  }
}

export default new TransactionService()
