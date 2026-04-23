const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs");

function cloudinaryEnvOk() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function cloudinaryStorageResolvable() {
  try {
    require.resolve("multer-storage-cloudinary");
    return true;
  } catch {
    return false;
  }
}

function buildMulter() {
  if (cloudinaryEnvOk() && cloudinaryStorageResolvable()) {
    try {
      const { CloudinaryStorage } = require("multer-storage-cloudinary");
      const cloudinary = require("../config/cloudinary");
      const storage = new CloudinaryStorage({
        cloudinary,
        params: {
          folder: "autodriv/vehicles",
          allowed_formats: ["jpg", "jpeg", "png", "webp"]
        }
      });
      return multer({ storage });
    } catch (err) {
      console.warn(
        "[upload] Falha ao configurar Cloudinary — usando disco temporário:",
        err.message
      );
    }
  } else if (cloudinaryEnvOk() && !cloudinaryStorageResolvable()) {
    console.warn(
      "[upload] multer-storage-cloudinary não instalado — uploads vão para disco temporário (instale a dependência ou remova CLOUDINARY_* se não for usar)."
    );
  }

  const tmp = path.join(os.tmpdir(), "autodriv-uploads");
  try {
    fs.mkdirSync(tmp, { recursive: true });
  } catch (_) {
    /* ignore */
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmp),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "") || ".bin";
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
      cb(null, safe);
    }
  });

  return multer({ storage });
}

module.exports = buildMulter();
