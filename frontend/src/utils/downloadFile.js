// Triggers a browser download of CSV text as a .csv file.
//
// Creates a Blob, points a temporary <a download> element at it, and clicks
// it. The element is appended to the document first because some browsers
// ignore clicks on detached anchors.
export function downloadCsv(csvText, filename) {
  const blob = new Blob([csvText], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
