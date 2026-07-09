const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');
const Collection = require('../models/Collection');

exports.create = asyncHandler(async (req, res) => {
  const { name, description, coverDreamId } = req.body;
  if (!name || !name.trim()) return errorResponse(res, 'Nome é obrigatório', 400);

  const existing = await Collection.findOne({ userId: req.userId, name: name.trim() });
  if (existing) return errorResponse(res, 'Já existe uma coleção com este nome', 409);

  const collection = await Collection.create({
    userId: req.userId,
    name: name.trim(),
    description: description || '',
    coverDreamId: coverDreamId || null,
  });

  successResponse(res, collection, 201);
});

exports.list = asyncHandler(async (req, res) => {
  const collections = await Collection.find({ userId: req.userId })
    .sort({ updatedAt: -1 })
    .populate('coverDreamId', 'textoSonho categorias');
  successResponse(res, collections);
});

exports.getById = asyncHandler(async (req, res) => {
  const collection = await Collection.findOne({ _id: req.params.id, userId: req.userId })
    .populate('dreams');
  if (!collection) return errorResponse(res, 'Coleção não encontrada', 404);
  successResponse(res, collection);
});

exports.update = asyncHandler(async (req, res) => {
  const { name, description, coverDreamId } = req.body;
  const collection = await Collection.findOne({ _id: req.params.id, userId: req.userId });
  if (!collection) return errorResponse(res, 'Coleção não encontrada', 404);

  if (name !== undefined) collection.name = name.trim();
  if (description !== undefined) collection.description = description;
  if (coverDreamId !== undefined) collection.coverDreamId = coverDreamId;

  await collection.save();
  successResponse(res, collection);
});

exports.remove = asyncHandler(async (req, res) => {
  const collection = await Collection.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!collection) return errorResponse(res, 'Coleção não encontrada', 404);
  successResponse(res, { message: 'Coleção removida' });
});

exports.addDream = asyncHandler(async (req, res) => {
  const { dreamId } = req.body;
  if (!dreamId) return errorResponse(res, 'dreamId é obrigatório', 400);

  const collection = await Collection.findOne({ _id: req.params.id, userId: req.userId });
  if (!collection) return errorResponse(res, 'Coleção não encontrada', 404);

  if (collection.dreams.includes(dreamId)) {
    return errorResponse(res, 'Sonho já está na coleção', 409);
  }

  collection.dreams.push(dreamId);
  await collection.save();
  successResponse(res, collection);
});

exports.removeDream = asyncHandler(async (req, res) => {
  const { dreamId } = req.body;
  if (!dreamId) return errorResponse(res, 'dreamId é obrigatório', 400);

  const collection = await Collection.findOne({ _id: req.params.id, userId: req.userId });
  if (!collection) return errorResponse(res, 'Coleção não encontrada', 404);

  collection.dreams = collection.dreams.filter(id => id.toString() !== dreamId);
  await collection.save();
  successResponse(res, collection);
});
