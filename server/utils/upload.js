const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * Multer storage configuration for avatar uploads
 * Stores files in /server/uploads/avatars/ with unique filenames
 */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: {userId}_{timestamp}.{ext}
    const userId = req.params.id || req.user.id;
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${userId}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

/**
 * Multer upload configuration for avatar images
 * - Max file size: 5MB
 * - Allowed types: jpg, jpeg, png, gif
 */
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed'));
  }
});

/**
 * Process uploaded avatar image
 * - Resize to 200x200px (cover fit)
 * - Convert to JPEG format
 * - Optimize quality (90%)
 * - Remove EXIF data for privacy
 *
 * @param {string} filePath - Path to uploaded image file
 * @returns {Promise<string>} - Path to processed image
 */
async function processAvatar(filePath) {
  try {
    const ext = path.extname(filePath);
    const outputPath = filePath.replace(ext, '_processed.jpg');

    // Resize and optimize image
    await sharp(filePath)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 90,
        progressive: true
      })
      .toFile(outputPath);

    // Delete original file
    fs.unlinkSync(filePath);

    // Rename processed file to original name (with .jpg extension)
    const finalPath = filePath.replace(ext, '.jpg');
    fs.renameSync(outputPath, finalPath);

    return finalPath;
  } catch (err) {
    // Clean up on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Failed to process image: ${err.message}`);
  }
}

/**
 * Delete avatar file from filesystem
 *
 * @param {string} filename - Name of file to delete
 * @returns {boolean} - True if deleted successfully
 */
function deleteAvatar(filename) {
  try {
    const filePath = path.join(__dirname, '../uploads/avatars', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error deleting avatar:', err);
    return false;
  }
}

module.exports = {
  avatarUpload,
  processAvatar,
  deleteAvatar
};
