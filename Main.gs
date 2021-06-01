//////////// Configs ////////////

let config = {
  "sender_name": "Aung's Bot",
  "email_address": "from@gmail.com",
  "subject": "Utility Bill",
  "to": "to@gmail.com",  // comma separated values
  "processedLabelName": "Automated/Processed",
  "cronitor_code": "<Cronitor code>",
  "attachmentFolderId": "<Google Drive Folder ID",
  "notion": {
    "api_key": "<API key>",
    "bill_database_id": "<Bill Database ID>"
  }
}

/*
 * Set variables in the `start()` method 
 */
let GlobalVars = {
  afterDate: null,
  emailScripts: null
}

/*
 * Must call this in the beginning of "start" method, otherwise some variables will not have been loaded
 */
function setupGlobalVars() {
  GlobalVars.afterDate = Utils.afterDate()
  GlobalVars.emailScripts = [script_pgebill, script_waterbill, script_garbagebill]
}

//////////// Start ////////////

function start() {
  setupGlobalVars()
  createProcessedLabelIfNeeded()
  const labelsMap = getLabels()
  const labelIds = filterLabelsBasedOnEmailScripts(labelsMap)
  const messages = getEmailMessages(labelIds)
  const messageDetails = getMessageDetails(messages, labelIds, labelsMap[config.processedLabelName])
  const parsedData = parseEmails(messageDetails)
  if (sendEmail(parsedData)) {
    addEntryIntoNotion(parsedData)
  }
  applyProcessedLabelIfNeeded(labelsMap, messages)
  Utils.clearFolder(config.attachmentFolderId)
  notifyCronitorIfNeeded()
}

//////////// Helpers ////////////

function createProcessedLabelIfNeeded() {
  if (!config.processedLabelName) { return }

  try {
    Gmail.Users.Labels.create({
      name: config.processedLabelName,
      type: 'user',
      messageListVisibility: 'show',
      labelListVisibility: 'labelShow',
      color: {
        textColor: '#04502e',
        backgroundColor: '#a2dcc1'
      }
    }, 'me')
  } catch (error) {
    if (!error) {
      console.log(`Label "${config.email.processedLabelName}" created`)
    } else if (error.details.code == 409) {
      // Label already exists - no action needed
    } else {
      console.log(`Error while creating label: ${error.message}`)
    }
  }
}

function getLabels() {
  const object = Gmail.Users.Labels.list('me')
  const labels = object.labels

  let labelsMap = {}
  for (const label of labels) {
    let name = label['name']
    let id = label['id']
    labelsMap[name] = id
  }
  return labelsMap
}

function filterLabelsBasedOnEmailScripts(labelsMap) {
  const labelIds = []
  GlobalVars.emailScripts.forEach(script => {
    const labelName = script.labelName
    if (labelName != null && labelsMap[labelName]) {
      const labelId = labelsMap[labelName]
      script.labelId = labelId
      labelIds.push(labelId)
    }
  })
  return labelIds
}

function getEmailMessages(labelIds) {
  const messages = []
  const q = `after:${GlobalVars.afterDate.format('YYYY/MM/DD')}`
  for (const labelId of labelIds) {
    let output = Gmail.Users.Messages.list('me', {
      labelIds: labelId,
      q: q
    })

    if (output.messages) {
      messages.push(...output.messages)
    }
  }
  return messages
}

function getMessageDetails(messages, labelIds, processedLabelId) {
  if (!messages) {
    throw ('Failed to get email message details')
  }

  let messageDetails = {}
  labelIds = new Set(labelIds)
  for (const message of messages) {
    let messageDetail = Gmail.Users.Messages.get('me', message.id)
    if (!messageDetail || !messageDetail.payload) {
      continue
    }
    if (processedLabelId && messageDetail.labelIds.includes(processedLabelId)) {
      console.warn(`Skipping email id ${messageDetail.id} since it has already been processed`)
      continue
    }

    const object = {
      'id': messageDetail.id,
      'payload': messageDetail.payload
    }
    for (const labelId of messageDetail.labelIds) {
      if (labelIds.has(labelId)) {
        object.labelId = labelId
        break
      }
    }
    let parts = messageDetail.payload.parts ? messageDetail.payload.parts : [messageDetail.payload]
    for (const rootPart of parts) {
      switch (rootPart.mimeType) {
        case 'text/html':
          object.body = rootPart.body.data
          break
        case 'multipart/alternative':
          let innerPart = null
          for (let part in rootPart.parts) {
            if (part.mimeType === 'text/plain') {
              innerPart = part
            }
          }

          if (innerPart) {
            object.body = innerPart.body.data
          }
          break
        case 'application/pdf':
          if (!object.attachments) {
            object.attachments = []
          }

          const attachment = Gmail.Users.Messages.Attachments.get('me', object.id, rootPart.body.attachmentId)

          if (attachment) {
            let attachmentObject = {
              id: rootPart.body.attachmentId,
              base64Value: attachment.data,
              fileName: `${Utilities.getUuid()}.pdf`,
            }
            object.attachments.push(attachmentObject)
          }
          break
      }
    }

    if (!messageDetails[object.labelId]) {
      messageDetails[object.labelId] = []
    }
    messageDetails[object.labelId].push(object)
  }
  return messageDetails
}

function parseEmails(messageDetails) {
  let parsedEmails = []
  for (const emailScript of GlobalVars.emailScripts) {
    console.info(`Parsing email script: ${emailScript.displayName}`)

    const emails = messageDetails[emailScript.labelId]
    if (emails && emails.length > 0) {
      for (const email of emails) {
        let parsedEmail = emailScript.parse(email)
        parsedEmail.displayName = emailScript.displayName
        parsedEmails.push(parsedEmail)
      }
    } else {
      let parsedEmail = emailScript.parse(null)
      parsedEmail.displayName = emailScript.displayName
      parsedEmails.push(parsedEmail)
    }
  }
  return parsedEmails
}

function sendEmail(parsedEmails) {
  let { text, html, attachments } = composeEmail(parsedEmails)

  try {
    MailApp.sendEmail({
      name: `${config.sender_name} <${config.email_address}>`,
      to: config.to,
      subject: config.subject,
      body: text,
      htmlBody: html,
      attachments: attachments
    })
    return true
  } catch (error) {
    console.error(`Failed to send email: ${error.message}`)
  }
  return false
}

function composeEmail(parsedEmails) {
  const todayDate = moment()
  const lastMonth = moment().subtract(1, 'months')
  let attachments = []
  let totalAmount = parseFloat(0)
  let text = `Utility Bill for ${lastMonth.format('MMMM YYYY')}`
  let html = `<h2>Utility Bill for ${lastMonth.format('MMMM YYYY')}</h2>`
  html += `\n<ul>`

  for (const parsedEmail of parsedEmails) {
    totalAmount += parseFloat(parsedEmail.billAmount)
    text += `\n* ${parsedEmail.billDescription}`
    html += `\n<li>${parsedEmail.billDescription}</li>`

    if (parsedEmail.fileData) {
      const blob = Utilities.newBlob(parsedEmail.fileData, parsedEmail.fileContentType, parsedEmail.fileName)
      attachments.push(blob)
    }
  }
  text += `\n\nTotal: $${totalAmount.toFixed(2)}`
  text += '\n------------------------------------------'
  text += `\nThis bill was auto-generated and ran on ${todayDate.format('MM/DD/YYYY')}. `
  text += `It looked for any new bills that came in a month ago after ${GlobalVars.afterDate.format('MM/DD/YYYY')}`
  console.info(`\nComposed Email in plain-text: \n${text}`)

  html += `\n</ul>`
  html += `<br/><div>Total: <b>$${totalAmount.toFixed(2)}</b></div>`
  html += '<div>------------------------------------------</div>'
  html += `<div>This bill was auto-generated and ran on ${todayDate.format('MM/DD/YYYY')}. `
  html += `It looked for any new bills that came in a month ago after ${GlobalVars.afterDate.format('MM/DD/YYYY')}</div>`
  // console.info(`\nComposed Email in HTML: \n${html}`)

  return {
    text,
    html,
    attachments
  }
}

function applyProcessedLabelIfNeeded(labelsMap, messages) {
  const labelId = labelsMap[config.processedLabelName]
  if (!labelId) { return }1

  for (const message of messages) {
    Gmail.Users.Messages.modify({ addLabelIds: [labelId] }, 'me', message.id)
  }
}

function notifyCronitorIfNeeded() {
  if (!config.cronitor_code) { return }

  UrlFetchApp.fetch(`https://cronitor.link/${config.cronitor_code}`)
}

//////////// Notion ////////////

function addEntryIntoNotion(parsedData) {
  if (!config.notion.api_key) { return }

  const title = moment().subtract(1, 'months').format('MMMM YYYY')
  let water = 0
  let pgne = 0 
  let garbage = 0
  let total = 0

  for (const data of parsedData) {
    switch(data.displayName) {
      case 'PG&E':
        pgne = data.billAmount
        break
      case 'Water':
        water = data.billAmount
        break 
      case 'Garbage':
        garbage = data.billAmount
        break
    }
    total += data.billAmount
  }

  var url = "https://api.notion.com/v1/pages"
  var data = {
    "parent": {
      "database_id": config.notion.bill_database_id
    },
    "properties": {
      "Bill": {
        "title": [
          {
            "text": {
              "content": title
            }
          }
        ]
      }, 
      "Water": {
        "number": water
      },
      "PG&E": {
        "number": pgne
      },
      "Garbage": {
        "number": garbage
      },
      "Total": {
        "number": total
      }
    }
  }
  var options = {
    'method': 'POST',
    'contentType': 'application/json',
    'headers': {
        'Authorization': `Bearer ${config.notion.api_key}`
    },
    'payload': JSON.stringify(data)
  }
  UrlFetchApp.fetch(url, options)
}
