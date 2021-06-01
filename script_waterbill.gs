const script_waterbill = {
  displayName: 'Water',
  labelName: 'Automated/HomeBill/Water',
  parse: function (messageDetail) {
    let parsedObject = {
      billAmount: parseFloat(0),
      billDescription: `Water: $0 (billed once every 2 months)`
    }

    if (!messageDetail) {
      console.warn('No water bill found this month.')
      return parsedObject
    }
    if (!messageDetail.attachments || messageDetail.attachments.length < 1) {
      console.warn('PDF attachments not found. Water bill cannot be retrieved.')
      return parsedObject
    }

    const attachment = messageDetail.attachments && messageDetail.attachments.length > 0 ? messageDetail.attachments[0] : null
    const text = Utils.pdfToText(attachment, config.attachmentFolderId)
    const lineSeparatedArray = text.split('\n')

    let isTotalAmountDueTextFound = false
    let billAmount = 0
    for (const text of lineSeparatedArray) {
      if (text.includes('$')) {
        let splitByDollar = text.split('$')[1]
        let splitBySpace = splitByDollar.split(' ')
        if (splitBySpace.length > 1 && splitBySpace[1] == 'AUTO-PAY') {
          isTotalAmountDueTextFound = true
          billAmount = splitBySpace[0]
          break
        }
      }
    }

    if (isTotalAmountDueTextFound) {
      parsedObject = {
        billAmount: parseFloat(billAmount),
        billDescription: `Water: $${billAmount} (billed once every 2 months)`,
        fileName: `Water_${attachment.fileName}`,
        fileData: attachment.base64Value,
        fileContentType: 'application/pdf'
      }
    }
    return parsedObject
  }
}
