const express = require('express')
const app = express()
const port = 3001
app.use(express.static('dist/public'))
app.get('/', (req, res) => {
  res.send(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
    </head>
    <body>
      <script src="/bundle.js"></script>
    </body>
    </html>`
  )
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})