const router = require('express').Router();
const { Author, Comment, Story, Video, Ad, Subscriber, AuditLog } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ─── AUTHORS ─────────────────────────────────────────────────────────────────
router.get('/authors', async (req, res) => {
  try {
    const authors = await Author.find().sort({ name: 1 }).lean();
    // attach story count
    const withCounts = await Promise.all(authors.map(async a => ({
      ...a, id: a._id,
      story_count: await Story.countDocuments({ author_id: a._id }),
    })));
    res.json(withCounts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/authors/:id', async (req, res) => {
  try {
    const a = await Author.findById(req.params.id).lean();
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ ...a, id: a._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/authors/:id/stories', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [stories, total] = await Promise.all([
      Story.find({ author_id: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Story.countDocuments({ author_id: req.params.id }),
    ]);
    res.json({ stories: stories.map(s => ({ ...s, id: s._id, created_at: s.createdAt })), total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/authors', auth, requireRole('Admin', 'Editor'), upload.single('profile_image'), async (req, res) => {
  try {
    const { name, bio, email, twitter } = req.body;
    const profile_image = req.file ? `uploads/${req.file.filename}` : 'uploads/default_profile.png';
    const author = await Author.create({ name, bio, email, twitter, profile_image });
    await AuditLog.create({ username: req.user.username, action: `Created author: ${name}` });
    res.status(201).json({ id: author._id, message: 'Author created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/authors/:id', auth, requireRole('Admin', 'Editor'), upload.single('profile_image'), async (req, res) => {
  try {
    const existing = await Author.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { name, bio, email, twitter } = req.body;
    const profile_image = req.file ? `uploads/${req.file.filename}` : existing.profile_image;
    await Author.findByIdAndUpdate(req.params.id, { name, bio, email, twitter, profile_image });
    res.json({ message: 'Author updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/authors/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    await Author.findByIdAndDelete(req.params.id);
    await AuditLog.create({ username: req.user.username, action: `Deleted author ID: ${req.params.id}` });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────
router.get('/comments', auth, async (req, res) => {
  try {
    const { status = 'pending', story_id, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (story_id) query.story_id = story_id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('story_id', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Comment.countDocuments(query),
    ]);

    res.json({
      comments: comments.map(c => ({
        ...c, id: c._id,
        story_title: c.story_id?.title || '',
        created_at: c.createdAt,
      })),
      total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/comments/story/:story_id', async (req, res) => {
  try {
    const comments = await Comment.find({ story_id: req.params.story_id, status: 'approved' })
      .sort({ createdAt: 1 }).lean();
    res.json(comments.map(c => ({ ...c, id: c._id, created_at: c.createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/comments', async (req, res) => {
  try {
    const { story_id, parent_id, name, email, comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ error: 'Comment text required' });
    const c = await Comment.create({
      story_id, parent_id: parent_id || null,
      name: name?.trim() || 'BANYA',
      email: email || '',
      comment: comment.trim(),
    });
    res.status(201).json({ id: c._id, message: 'Comment submitted for review' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/comments/:id/approve', auth, requireRole('Admin', 'Editor', 'Moderator'), async (req, res) => {
  try {
    await Comment.findByIdAndUpdate(req.params.id, { status: 'approved' });
    await AuditLog.create({ username: req.user.username, action: `Approved comment ID: ${req.params.id}` });
    res.json({ message: 'Comment approved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/comments/:id/spam', auth, requireRole('Admin', 'Moderator'), async (req, res) => {
  try {
    await Comment.findByIdAndUpdate(req.params.id, { status: 'spam' });
    res.json({ message: 'Marked as spam' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/comments/:id', auth, requireRole('Admin', 'Moderator'), async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    await AuditLog.create({ username: req.user.username, action: `Deleted comment ID: ${req.params.id}` });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── VIDEOS ──────────────────────────────────────────────────────────────────
router.get('/videos', async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const query = {};
    if (category) query.category = category;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const videos = await Video.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
    res.json(videos.map(v => ({ ...v, id: v._id, created_at: v.createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/videos', auth, requireRole('Admin', 'Editor'), upload.fields([{ name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, youtube_url, category } = req.body;
    const thumbnail = req.files?.thumbnail?.[0] ? `uploads/${req.files.thumbnail[0].filename}` : '';

    let embedUrl = youtube_url;
    if (youtube_url) {
      const ytMatch = youtube_url.match(/[?&]v=([^?&]+)/) || youtube_url.match(/youtu\.be\/([^?&]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    const video = await Video.create({ title, youtube_url: embedUrl, thumbnail, category: category || 'General' });
    await AuditLog.create({ username: req.user.username, action: `Added video: ${title}` });
    res.status(201).json({ id: video._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/videos/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    await AuditLog.create({ username: req.user.username, action: `Deleted video ID: ${req.params.id}` });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADS ─────────────────────────────────────────────────────────────────────
router.get('/ads', async (req, res) => {
  try {
    const { position } = req.query;
    const query = { active: true };
    if (position) query.position = position;
    const ads = await Ad.find(query).sort({ createdAt: -1 }).lean();
    res.json(ads.map(a => ({ ...a, id: a._id, created_at: a.createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ads/all', auth, async (req, res) => {
  try {
    const ads = await Ad.find({}).sort({ createdAt: -1 }).lean();
    res.json(ads.map(a => ({ ...a, id: a._id, created_at: a.createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ads', auth, requireRole('Admin'), upload.single('file'), async (req, res) => {
  try {
    const { type, link, position, text } = req.body;
    const file = req.file ? `uploads/${req.file.filename}` : '';
    const ad = await Ad.create({ type: type || 'image', file, link: link || '#', position: position || 'sidebar', text: text || '' });
    await AuditLog.create({ username: req.user.username, action: 'Created advertisement' });
    res.status(201).json({ id: ad._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/ads/:id/toggle', auth, requireRole('Admin'), async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Not found' });
    ad.active = !ad.active;
    await ad.save();
    res.json({ active: ad.active });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/ads/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    await Ad.findByIdAndDelete(req.params.id);
    await AuditLog.create({ username: req.user.username, action: `Deleted ad ID: ${req.params.id}` });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SUBSCRIBERS ─────────────────────────────────────────────────────────────
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email))
      return res.status(400).json({ status: 'error', message: 'Valid email required' });

    await Subscriber.create({ email: email.toLowerCase().trim(), name: name || '' });
    res.json({ status: 'success', message: 'Subscribed successfully! 🎉' });
  } catch (err) {
    if (err.code === 11000) return res.json({ status: 'info', message: 'Already subscribed.' });
    res.status(500).json({ status: 'error', message: 'Server error, please try again.' });
  }
});

router.get('/subscribers', auth, requireRole('Admin', 'Editor'), async (req, res) => {
  try {
    const subs = await Subscriber.find({}).sort({ createdAt: -1 }).lean();
    res.json(subs.map(s => ({ ...s, id: s._id, subscribed_at: s.createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const [storyCount, viewsAgg, pendingComments, subscriberCount, trending, categoryStats] = await Promise.all([
      Story.countDocuments({ status: 'published' }),
      Story.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Comment.countDocuments({ status: 'pending' }),
      Subscriber.countDocuments({ status: 'active' }),
      Story.find({ status: 'published' }).select('title category views').sort({ views: -1 }).limit(5).lean(),
      Story.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$category', count: { $sum: 1 }, views: { $sum: '$views' } } },
        { $sort: { count: -1 } },
        { $project: { category: '$_id', count: 1, views: 1, _id: 0 } },
      ]),
    ]);

    res.json({
      stories: storyCount,
      views: viewsAgg[0]?.total || 0,
      pendingComments,
      subscribers: subscriberCount,
      trending: trending.map(s => ({ ...s, id: s._id })),
      categoryStats,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
router.get('/audit-logs', auth, requireRole('Admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean();
    res.json(logs.map(l => ({ ...l, id: l._id, created_at: l.createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BREAKING NEWS TICKER ─────────────────────────────────────────────────────
router.get('/breaking', async (req, res) => {
  try {
    const stories = await Story.find({ status: 'published' })
      .select('title').sort({ createdAt: -1 }).limit(8).lean();
    res.json(stories.map(s => ({ title: s.title })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
