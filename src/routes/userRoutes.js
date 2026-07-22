const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const User = require('../models/User');
const { getCurrentPlan } = require('../controllers/planController');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    const planInfo = user.checkUserPlan();
    res.json({ 
      ...user.toObject(), 
      planInfo: {
        remainingDreams: planInfo.remainingDreams,
        maxDreams: planInfo.maxDreams,
        canGenerateImage: planInfo.canGenerateImage,
        canUseSleepMode: planInfo.canUseSleepMode,
        canSeeWeeklySummary: planInfo.canSeeWeeklySummary
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/plan', protect, getCurrentPlan);

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, nickname, birthDate, birthTime, birthCity } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (name !== undefined) user.name = name;
    if (nickname !== undefined) user.nickname = nickname;
    if (birthDate !== undefined) user.birthDate = birthDate;
    if (birthTime !== undefined) user.birthTime = birthTime;
    if (birthCity !== undefined) user.birthCity = birthCity;

    await user.save();
    const { password, ...userObj } = user.toObject();
    res.json({ message: 'Perfil atualizado com sucesso', user: userObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/avatar', protect, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'Imagem é obrigatória' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ message: 'Serviço de upload não configurado' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch (err) {
        console.error('[Avatar] Erro ao deletar avatar anterior:', err.message);
      }
    }

    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'dream-line/avatars',
      resource_type: 'image',
      format: 'png',
      transformation: [
        { width: 256, height: 256, crop: 'fill', gravity: 'face' },
      ],
    });

    user.avatar = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save();

    const { password, ...userObj } = user.toObject();
    res.json({ message: 'Avatar atualizado com sucesso', user: userObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;