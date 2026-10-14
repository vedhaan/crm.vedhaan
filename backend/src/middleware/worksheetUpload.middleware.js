const multer = require('multer')
const path = require('path')

const MAX_FILE_MB = 15
const MAX_FILES_PER_REQUEST = 5

const ALLOWED_EXT = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx',
  '.txt', '.rtf', '.md', '.odt', '.ods', '.odp',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.zip', '.rar', '.7z'
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES_PER_REQUEST },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXT.has(ext)) return cb(new Error(`File type "${ext || 'unknown'}" is not allowed`))
    cb(null, true)
  }
})

// Turns multer errors into clean 400 responses instead of a 500
const uploadFiles = (req, res, next) => {
  upload.array('files', MAX_FILES_PER_REQUEST)(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: `File too large (max ${MAX_FILE_MB} MB)` })
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: `Upload at most ${MAX_FILES_PER_REQUEST} files at a time` })
    }
    return res.status(400).json({ message: err.message || 'Upload failed' })
  })
}

module.exports = { uploadFiles }