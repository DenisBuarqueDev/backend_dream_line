const cloudinary = require('cloudinary').v2;
const fs = require('fs-extra');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

async function uploadDreamImage(filePath) {
  if (!isConfigured()) {
    throw new Error('Cloudinary não configurado. Verifique CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.');
  }

  const devLog = process.env.NODE_ENV !== 'production' ? console.log : () => {};
  devLog('☁ Upload iniciado:', filePath);

  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'dream-line/dreams',
    resource_type: 'image',
    format: 'png',
    transformation: [
      { width: 1024, height: 768, crop: 'fill', gravity: 'auto' },
    ],
  });

  devLog('☁ Upload concluído');
  devLog('☁ URL Cloudinary:', result.secure_url);
  devLog('☁ Public ID:', result.public_id);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

async function deleteDreamImage(publicId) {
  if (!publicId) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    const devLog = process.env.NODE_ENV !== 'production' ? console.log : () => {};
    devLog('☁ Imagem deletada do Cloudinary:', publicId, result.result);
  } catch (error) {
    console.error('☁ Erro ao deletar imagem do Cloudinary:', error.message);
  }
}

module.exports = { uploadDreamImage, deleteDreamImage, isConfigured };
