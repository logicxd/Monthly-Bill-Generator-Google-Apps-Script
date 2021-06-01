const script_pgebill = {
  displayName: 'PG&E',
  labelName: 'Automated/HomeBill/PGnE',
  parse: function (messageDetail) {
    let parsedObject = {
      billAmount: parseFloat(0),
      billDescription: 'PG&E Electricity and Gas: $0'
    }

    if (!messageDetail) {
      console.warn('No PG&E bill found this month.')
      return parsedObject
    }

    const attachment = messageDetail.attachments && messageDetail.attachments.length > 0 ? messageDetail.attachments[0] : null
    
    let blob = Utilities.newBlob(messageDetail.body)
    let text = blob.getDataAsString()
    let split = text.split('The amount of $')
    let textContainingTheAmount = split.length == 2 ? split[1] : null
    let splitbySpace = textContainingTheAmount.split(' ')
    let billAmount = splitbySpace.length > 0 ? splitbySpace[0] : null

    if (billAmount) {
      parsedObject = {
        billAmount: parseFloat(billAmount),
        billDescription: `PG&E Electricity and Gas: $${billAmount} (PDF password: PdgriSkgoU8MQ6Aj)`,
        fileName: attachment ? `PG&E_${attachment.fileName}` : null,
        fileData: attachment ? attachment.base64Value : null,
        fileContentType: 'application/pdf'
      }
    }

    return parsedObject
  }
}
