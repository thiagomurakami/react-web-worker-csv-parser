import csv from 'csvtojson'
import Ajv from 'ajv'

import Schema from './Schema.json'

const ajv = new Ajv()
const validate = ajv.compile(Schema)

// Respond to message from parent thread
const batchSize = 1000

self.addEventListener('message', event => {
  if (event.data.csv) {
    let processed = 0
    csv()
      .fromString(event.data.csv)
      .subscribe(json => {
        return new Promise((resolve, reject) => {
          const valid = validate(json)
          if (!valid) {
            reject(validate.errors)
          }

          processed = processed + 1
          if (processed > batchSize) {
            self.postMessage({ processed })
            processed = 0
          }
          resolve(json)
        })
      })
      .on('done', err => {
        if (!err) {
          self.postMessage({ processed })
        }
      })
  }
})
