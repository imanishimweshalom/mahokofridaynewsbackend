const router = require('express').Router();
const slugify = require('slugify');
const { Story, Author, AuditLog } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/stories  — public, with filters + pagination
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12, status = 'published', featured } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (featured) query.featured = true;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [stories, total] = await Promise.all([
      Story.find(query)
        .populate('author_id', 'profile_image bio name twitter')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Story.countDocuments(query),
    ]);

    // Flatten author data for frontend compatibility
    const mapped = stories.map(s => ({
      ...s,
      id: s._id,
      author_avatar: s.author_id?.profile_image || s.author_image || '',
      author_bio_full: s.author_id?.bio || s.author_bio || '',
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }));

    res.json({ stories: mapped, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stories/stats/popular
router.get('/stats/popular', async (req, res) => {
  try {
    const { category, limit = 5 } = req.query;
    const query = { status: 'published' };
    if (category) query.category = category;
    const stories = await Story.find(query)
      .select('title image category views createdAt')
      .sort({ views: -1 })
      .limit(parseInt(limit))
      .lean();
    res.json(stories.map(s => ({ ...s, id: s._id, created_at: s.createdAt })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stories/:id  — single story, increments views
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author_id', 'profile_image bio name twitter email').lean();

    if (!story) return res.status(404).json({ error: 'Story not found' });

    res.json({
      ...story,
      id: story._id,
      author_avatar: story.author_id?.profile_image || story.author_image || '',
      author_bio_full: story.author_id?.bio || story.author_bio || '',
      author_twitter: story.author_id?.twitter || '',
      created_at: story.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stories  — create (admin)
router.post('/', auth, requireRole('Admin', 'Editor', 'Journalist'), upload.single('image'), async (req, res) => {
  try {
    const { title, category, subcategory, description, author_id, tags, meta_description, status, scheduled_at, featured } = req.body;
    const image = req.file ? `uploads/${req.file.filename}` : 'uploads/default.jpg';

    let authorName = 'Editorial Team';
    if (author_id) {
      const a = await Author.findById(author_id);
      if (a) authorName = a.name;
    }

    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
    const story = await Story.create({
      title, slug, category, subcategory: subcategory || '',
      description, image, author: authorName,
      author_id: author_id || null,
      tags: tags || '', meta_description: meta_description || '',
      status: status || 'published',
      scheduled_at: scheduled_at || null,
      featured: featured === 'true' || featured === true,
    });

    await AuditLog.create({ username: req.user.username, action: `Created story: ${title}` });
    res.status(201).json({ id: story._id, message: 'Story created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stories/:id  — update (admin)
router.put('/:id', auth, requireRole('Admin', 'Editor'), upload.single('image'), async (req, res) => {
  try {
    const existing = await Story.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { title, category, subcategory, description, author_id, tags, meta_description, status, featured } = req.body;
    const image = req.file ? `uploads/${req.file.filename}` : existing.image;

    let authorName = existing.author;
    if (author_id) {
      const a = await Author.findById(author_id);
      if (a) authorName = a.name;
    }

    await Story.findByIdAndUpdate(req.params.id, {
      title, category, subcategory: subcategory || '',
      description, image, author: authorName,
      author_id: author_id || null,
      tags: tags || '', meta_description: meta_description || '',
      status, featured: featured === 'true' || featured === true,
    });

    await AuditLog.create({ username: req.user.username, action: `Updated story ID: ${req.params.id}` });
    res.json({ message: 'Story updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stories/:id
router.delete('/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    await Story.findByIdAndDelete(req.params.id);
    await AuditLog.create({ username: req.user.username, action: `Deleted story ID: ${req.params.id}` });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/:id/react
router.post('/:id/react', async (req, res) => {
  try {
    const { type } = req.body;
    if (!['likes', 'dislikes'].includes(type))
      return res.status(400).json({ error: 'Invalid reaction type' });

    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $inc: { [type]: 1 } },
      { new: true }
    ).select('likes dislikes');

    res.json({ likes: story.likes, dislikes: story.dislikes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
