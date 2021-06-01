// Install Third Party Dependencies
eval(UrlFetchApp.fetch('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js').getContentText());

const Utils = {
  afterDate: function() {
      return moment.utc().subtract(1, 'months').subtract(1, 'days')
  },
  pdfToText: function(attachment, folderId) {
    const blob = Utilities.newBlob(attachment.base64Value, 'application/pdf', attachment.fileName)

    let resource = {
      title: blob.getName(),
      mimeType: blob.getContentType(),
      parents: [{id: folderId}]
    }

    var file = Drive.Files.insert(resource, blob, { ocr: true, ocrLanguage: 'en' })
    let doc = DocumentApp.openById(file.id)
    let text = doc.getBody().getText()
    return text
  },
  clearFolder: function(folderId) {
    const folder = DriveApp.getFolderById(folderId)
    while (folder.getFiles().hasNext()) {
      const file = folder.getFiles().next()
      file.setTrashed(true)
    }
  }
}
