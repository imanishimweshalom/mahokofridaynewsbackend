const router = require('express').Router();

const {
  Author,
  Comment,
  Story,
  Video,
  Ad,
  Subscriber,
  AuditLog
} = require('../models');

const mongoose = require('mongoose');

const sendNewsletter = require("../services/emailService");

const {
  auth,
  requireRole
} = require('../middleware/auth');

const upload = require('../middleware/upload');
const uploadToCloudinary = require('../middleware/cloudinaryUpload');


// ================= AUTHORS =================


// GET ALL AUTHORS
router.get('/authors', async (req, res) => {
  try {

    const authors = await Author.find()
      .sort({ name: 1 })
      .lean();


    const result = await Promise.all(
      authors.map(async (a) => ({
        ...a,
        id: a._id,
        story_count: await Story.countDocuments({
          author_id: a._id
        })
      }))
    );


    res.json(result);


  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});




// IMPORTANT: iyi route ijya mbere ya /authors/:id
// GET STORIES BY AUTHOR
// UPDATE AUTHOR
router.put(
  '/authors/:id',
  auth,
  requireRole('Admin', 'Editor'),
  upload.single('profile_image'),

  async (req, res) => {
    try {

      const { id } = req.params;

      // Check valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: 'Invalid author id'
        });
      }

      const author = await Author.findById(id);

      if (!author) {
        return res.status(404).json({
          error: 'Author not found'
        });
      }

      const {
        name,
        bio,
        email,
        twitter,
        portfolio,
        website,
        facebook,
        instagram,
        linkedin,
        youtube
      } = req.body;

      // Update text fields only when provided
      if (name !== undefined) author.name = name;
      if (bio !== undefined) author.bio = bio;
      if (email !== undefined) author.email = email;
      if (twitter !== undefined) author.twitter = twitter;

      if (portfolio !== undefined) author.portfolio = portfolio;
      if (website !== undefined) author.website = website;
      if (facebook !== undefined) author.facebook = facebook;
      if (instagram !== undefined) author.instagram = instagram;
      if (linkedin !== undefined) author.linkedin = linkedin;
      if (youtube !== undefined) author.youtube = youtube;

      // New profile image
      if (req.file) {

        const result = await uploadToCloudinary(
          req.file.buffer,
          'authors'
        );

        author.profile_image = result.secure_url;
      }

      await author.save();

      await AuditLog.create({
        username: req.user.username,
        action: `Updated author: ${author.name}`
      });

      res.json({
        message: 'Author updated successfully',
        author: {
          ...author.toObject(),
          id: author._id
        }
      });

    } catch (err) {

      console.error('Update author error:', err);

      res.status(500).json({
        error: err.message
      });

    }
  }
);
router.get('/authors/:id/stories', async (req, res) => {

  try {


    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

      return res.status(400).json({
        error: "Invalid author id"
      });

    }


    const stories = await Story.find({

      author_id: req.params.id,

      status: "published"

    })
    .populate(
      'author_id',
      'profile_image bio name twitter'
    )
    .sort({
      createdAt:-1
    })
    .lean();



    res.json({

      stories: stories.map(s => ({

        ...s,

        id:s._id,


        author_avatar:
        s.author_id?.profile_image ||
        s.author_image ||
        '',


        author_bio_full:
        s.author_id?.bio ||
        s.author_bio ||
        '',


        author_twitter:
        s.author_id?.twitter ||
        '',


        created_at:
        s.createdAt,


        updated_at:
        s.updatedAt

      }))

    });



  } catch(err) {


    res.status(500).json({

      error:err.message

    });


  }

});




// GET SINGLE AUTHOR

router.get('/authors/:id', async(req,res)=>{

try{


const author =
await Author.findById(req.params.id)
.lean();



if(!author)

return res.status(404).json({

error:"Author not found"

});



res.json({

...author,

id:author._id

});



}catch(err){

res.status(500).json({

error:err.message

});


}

});





// CREATE AUTHOR

router.post(
'/authors',
auth,
requireRole('Admin','Editor'),
upload.single('profile_image'),

async(req,res)=>{


try{


const {
name,
bio,
email,
twitter
}=req.body;



let profile_image='';



if(req.file){

const result =
await uploadToCloudinary(
req.file.buffer,
'authors'
);


profile_image =
result.secure_url;

}




const author =
await Author.create({

name,

bio,

email,

twitter,

profile_image

});




await AuditLog.create({

username:req.user.username,

action:`Created author: ${name}`

});




res.status(201).json({

id:author._id,

message:"Author created"

});



}catch(err){


res.status(500).json({

error:err.message

});


}

});

// ================= COMMENTS =================


// GET COMMENTS BY STORY
router.get('/comments/story/:id', async(req,res)=>{

try{


const comments = await Comment.find({

story_id:req.params.id

})
.sort({
createdAt:-1
})
.lean();



res.json(
comments.map(c=>({

...c,

id:c._id,

created_at:c.createdAt

}))
);



}catch(err){

res.status(500).json({

error:err.message

});

}

});




// GET ALL COMMENTS ADMIN

router.get('/comments',
auth,
async(req,res)=>{

try{


const {

status='pending',

story_id,

page=1,

limit=20

}=req.query;



const query={};



if(status)

query.status=status;



if(story_id)

query.story_id=story_id;



const skip =
(parseInt(page)-1) *
parseInt(limit);



const comments =
await Comment.find(query)

.populate(
'story_id',
'title'
)

.sort({
createdAt:-1
})

.skip(skip)

.limit(parseInt(limit))

.lean();




res.json(

comments.map(c=>({

...c,

id:c._id,

story_title:
c.story_id?.title || '',

created_at:c.createdAt

}))

);



}catch(err){

res.status(500).json({

error:err.message

});

}


});




// CREATE COMMENT

router.post('/comments',
async(req,res)=>{

try{


const {

story_id,

parent_id,

name,

email,

comment

}=req.body;



if(!comment?.trim())

return res.status(400).json({

error:"Comment text required"

});




const newComment =
await Comment.create({

story_id,

parent_id:
parent_id || null,

name:
name?.trim() || "BANYA",

email:
email || "",

comment:
comment.trim(),

status:"pending"

});



res.status(201).json({

id:newComment._id,

message:"Comment submitted"

});



}catch(err){


res.status(500).json({

error:err.message

});


}

});





// ================= VIDEOS =================


router.get('/videos',
async(req,res)=>{

try{


const videos =
await Video.find()

.sort({
createdAt:-1
})

.lean();



res.json(

videos.map(v=>({

...v,

id:v._id,

created_at:v.createdAt

}))

);



}catch(err){

res.status(500).json({

error:err.message

});

}


});





router.post(
'/videos',

auth,

requireRole('Admin','Editor'),

upload.single('thumbnail'),

async(req,res)=>{


try{


const {

title,

youtube_url,

category

}=req.body;



let thumbnail="";



if(req.file){


const result =
await uploadToCloudinary(

req.file.buffer,

'videos'

);


thumbnail=result.secure_url;


}




let embedUrl=youtube_url;



if(youtube_url){


const match =

youtube_url.match(/[?&]v=([^?&]+)/)

||

youtube_url.match(/youtu\.be\/([^?&]+)/);



if(match)

embedUrl =
`https://www.youtube.com/embed/${match[1]}`;

}




const video =
await Video.create({

title,

youtube_url:embedUrl,

thumbnail,

category:category || "General"

});




await AuditLog.create({

username:req.user.username,

action:`Added video: ${title}`

});




res.status(201).json({

id:video._id

});



}catch(err){

res.status(500).json({

error:err.message

});

}


});





// ================= ADS =================


router.get('/ads',
async(req,res)=>{

try{


const query={

active:true

};



if(req.query.position)

query.position=req.query.position;



const ads =
await Ad.find(query)

.sort({
createdAt:-1
})

.lean();




res.json(

ads.map(a=>({

...a,

id:a._id,

created_at:a.createdAt

}))

);



}catch(err){

res.status(500).json({

error:err.message

});

}


});





router.get('/ads/all',
auth,
async(req,res)=>{

try{


const ads =
await Ad.find()

.sort({
createdAt:-1
})

.lean();



res.json(

ads.map(a=>({

...a,

id:a._id,

created_at:a.createdAt

}))

);



}catch(err){

res.status(500).json({

error:err.message

});

}


});






router.post(
'/ads',

auth,

requireRole('Admin'),

upload.single('file'),

async(req,res)=>{


try{


const {

type,

link,

position,

text

}=req.body;



let file="";

let cloudinary_public_id="";



if(req.file){


const result =
await uploadToCloudinary(

req.file.buffer,

'ads'

);



file=result.secure_url;

cloudinary_public_id=result.public_id;


}




const ad =
await Ad.create({

type:type || "image",

file,

cloudinary_public_id,

link:link || "#",

position:position || "sidebar",

text:text || "",

active:true

});




await AuditLog.create({

username:req.user.username,

action:"Created advertisement"

});




res.status(201).json({

id:ad._id,

message:"Ad created"

});



}catch(err){


res.status(500).json({

error:err.message

});


}

});
// ================= SUBSCRIBERS =================


router.post('/subscribe',
async(req,res)=>{

try{


const {

email,

name

}=req.body;



if(!email)

return res.status(400).json({

error:"Email required"

});



await Subscriber.create({

email:email.toLowerCase().trim(),

name:name || ""

});



res.json({

status:"success",

message:"Subscribed successfully"

});



}catch(err){


if(err.code===11000)

return res.json({

status:"info",

message:"Already subscribed"

});



res.status(500).json({

error:err.message

});


}

});





// ================= ANALYTICS =================


router.get('/analytics/overview',
auth,
async(req,res)=>{

try{


const [

stories,

views,

comments,

subscribers,

trending

]=await Promise.all([


Story.countDocuments({

status:"published"

}),


Story.aggregate([

{

$group:{

_id:null,

total:{

$sum:"$views"

}

}

}

]),



Comment.countDocuments({

status:"pending"

}),



Subscriber.countDocuments(),



Story.find({

status:"published"

})

.select(
'title category views'
)

.sort({

views:-1

})

.limit(5)

.lean()


]);




res.json({

stories,

views:views[0]?.total || 0,

pendingComments:comments,

subscribers,

trending:trending.map(s=>({

...s,

id:s._id

}))


});



}catch(err){

res.status(500).json({

error:err.message

});

}

});





// ================= BREAKING =================


router.get('/breaking',
async(req,res)=>{


try{


const stories =
await Story.find({

status:"published"

})

.select('title')

.sort({

createdAt:-1

})

.limit(8)

.lean();




res.json(

stories.map(s=>({

title:s.title

}))

);



}catch(err){

res.status(500).json({

error:err.message

});

}


});


// ================= NEWSLETTER =================

router.post("/newsletter/send", async(req,res)=>{

try{

const {subject,message}=req.body;


console.log("SUBJECT:", subject);
console.log("MESSAGE:", message);


const subscribers = await Subscriber.find({
active:true
});


console.log("SUBSCRIBERS:", subscribers);


const emails = subscribers.map(
subscriber => subscriber.email
);


console.log("EMAILS:", emails);



await sendNewsletter({
emails,
subject,
html:message
});


res.json({

message:"Newsletter sent successfully",

sentTo:emails.length

});


}catch(error){

console.log(error);

res.status(500).json({
error:error.message
});

}

});
module.exports = router;
