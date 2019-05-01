import createEvent from '@serverless/event-mocks'
import zlib from 'zlib'

function recordWrapper(event) {
  return {
    Records: [event]
  }
}

function encodeBody(body) {
  if (body) {
    return Buffer.from(body).toString('base64')
  }
}

async function gzipBody(body) {
  return new Promise((res, rej) => {
    zlib.gzip(body, function(error, result) {
      if (error) {
        return rej(error)
      }
      res(result)
    })
  })
}

function parsedBody(body) {
  return JSON.parse(body)
}

export const eventDict = {
  'aws:apiGateway': (body) => ({ body: body }),
  'aws:websocket': (body) => ({ body: body }),
  'aws:sns': (body) => recordWrapper({ Sns: { Message: body } }),
  'aws:sqs': (body) => recordWrapper({ body: body }),
  'aws:dynamo': (body) => recordWrapper({ dynamodb: body }),
  'aws:kinesis': (body) =>
    recordWrapper({
      kinesis: { data: encodeBody(body) }
    }),
  'aws:cloudWatchLog': async (body) => ({
    awslogs: { data: encodeBody(await gzipBody(body)) }
  }),
  'aws:s3': () => ({}),
  'aws:alexaSmartHome': (body) => parsedBody(body),
  'aws:alexaSkill': (body) => parsedBody(body),
  'aws:cloudWatch': (body) => parsedBody(body),
  'aws:iot': (body) => parsedBody(body),
  'aws:cognitoUserPool': (body) => parsedBody(body),
  'aws:websocket': (body) => ({ body: body })
}

async function wrapEvent(eventType, body) {
  if (eventDict.hasOwnProperty(eventType)) {
    return createEvent(eventType, await eventDict[eventType](body))
  }

  throw new Error('Invalid event specified.')
}

export async function generate(ctx) {
  const { options } = ctx.sls.processedInput
  const body = options.body === undefined ? '{}' : options.body
  const event = await wrapEvent(options.type, body)
  // eslint-disable-next-line no-console
  return console.log(JSON.stringify(event))
}

module.exports = {
  generate,
  eventDict
}