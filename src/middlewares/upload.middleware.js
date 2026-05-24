const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs");

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function getVehicleImageMaxBytes() {
  const raw = process.env.VEHICLE_IMAGE_MAX_BYTES;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

function imageMimeFilter(_req, file, cb) {
  const m = (file.mimetype || "").toLowerCase();
  const allowed =
    m === "image/jpeg" ||
    m === "image/jpg" ||
    m === "image/pjpeg" ||
    m === "image/png" ||
    m === "image/webp";
  if (allowed) {
    return cb(null, true);
  }
  cb(
    new Error(
      "Tipo de arquivo não permitido. Use JPEG, PNG ou WebP (image/jpeg, image/png, image/webp)"
    )
  );
}

function multerLimits() {
  return {
    fileSize: getVehicleImageMaxBytes(),
    files: 1
  };
}

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
      return multer({
        storage,
        limits: multerLimits(),
        fileFilter: imageMimeFilter
      });
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

  return multer({
    storage,
    limits: multerLimits(),
    fileFilter: imageMimeFilter
  });
}

module.exports = buildMulter();
