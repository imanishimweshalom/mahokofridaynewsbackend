require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const { AdminUser, Author, Story, Ad, Video } = require('./models');

const seed = async () => {
  await connectDB();

  // Clear existing
  await AdminUser.deleteMany({});
  await Author.deleteMany({});

  // Admin user
  const hashed = await bcrypt.hash('admin123', 10);
  await AdminUser.create({
    username: 'Gerard banya',
    email: 'admin@mfn.com',
    password: hashed,
    role: 'Admin',
  });
  console.log('✅ Admin created — username: "Gerard banya", password: "admin123"');

  // Default author
  const author = await Author.create({
    name: 'MFN Editorial Team',
    bio: 'The editorial team of Mahoko Friday News, dedicated to bringing you the latest news from Rwanda and beyond.',
    profile_image: 'uploads/default_profile.png',
    email: 'editorial@mfn.com',
  });
  console.log('✅ Default author created');

  // Sample stories
  const categories = ['Business', 'Sport', 'Technology', 'Health', 'Culture', 'Environment'];
  const sampleStories = categories.flatMap((cat, ci) =>
    Array.from({ length: 4 }, (_, i) => ({
      title: `${cat} Story ${i + 1}: Breaking developments in ${cat.toLowerCase()} sector`,
      slug: `${cat.toLowerCase()}-story-${i + 1}-${Date.now()}-${ci}-${i}`,
      category: cat,
      description: `<p>This is a sample story about ${cat}. Mahoko Friday News brings you the latest and most relevant ${cat.toLowerCase()} news from Rwanda and across Africa.</p><p>Stay tuned for more updates as this story develops. Our team of journalists is working to bring you comprehensive coverage.</p>`,
      image: 'uploads/default.jpg',
      author: 'MFN Editorial Team',
      author_id: author._id,
      status: 'published',
      views: Math.floor(Math.random() * 5000),
      likes: Math.floor(Math.random() * 200),
      featured: i === 0 && ci === 0,
    }))
  );
  await Story.insertMany(sampleStories);
  console.log(`✅ ${sampleStories.length} sample stories created`);

  console.log('\n🎉 Seed complete! Start the server with: npm run dev\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
