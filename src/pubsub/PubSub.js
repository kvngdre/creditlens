import logger from '../utils/Logger'

class PubSub {
  #events = {}

  subscribe = (eventName, fn) => {
    logger.silly(`Subscribed to know about ${eventName}`)

    // Add an event to an existing list or as new
    this.#events[eventName] = this.#events[eventName] || []
    this.#events[eventName].push(fn)
  }

  unsubscribe = (eventName, fn) => {
    logger.silly(`Unsubscribing from ${eventName}`)

    if (this.#events[eventName]) {
      this.#events[eventName] = this.#events[eventName].filter((f) => f !== fn)
    }
  }

  async publish (eventName, data, trx) {
    logger.silly(`Making a broadcast about ${eventName} event.`)

    // Emit or publish the event to anyone who is subscribed.
    if (this.#events[eventName]) {
      const handlerFns = this.#events[eventName]

      for (const fn of handlerFns) {
        await fn(data, trx)
      }
    }
  }
}

export default new PubSub()
