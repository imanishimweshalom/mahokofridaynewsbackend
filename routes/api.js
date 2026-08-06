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

const {
  auth,
  requireRole
} = require('../middleware/auth');

const upload = require('../middleware/upload');
const uploadToCloudinary = require('../middleware/cloudinaryUpload');



// ================= AUTHORS =================


// GET AUTHORS
router.get('/authors', async(req,res)=>{

try{

const authors = await Author.find()
.sort({name:1})
.lean();


const result = await Promise.all(
authors.map(async a=>({

...a,

id:a._id,

story_count:
await Story.countDocuments({
author_id:a._id
})

}))
);


res.json(result);


}catch(err){

res.status(500).json({
error:err.message
});

}

});




// GET SINGLE AUTHOR

router.get('/authors/:id',async(req,res)=>{

try{

const author =
await Author.findById(req.params.id)
.lean();


if(!author)
return res.status(404).json({
error:'Not found'
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





// CREATE AUTHOR CLOUDINARY

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


const uploadResult =
await uploadToCloudinary(
req.file.buffer,
'authors'
);


profile_image =
uploadResult.secure_url;


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

message:'Author created'

});



}catch(err){

res.status(500).json({
error:err.message
});

}


});







// UPDATE AUTHOR

router.put(
'/authors/:id',
auth,
requireRole('Admin','Editor'),
upload.single('profile_image'),

async(req,res)=>{


try{


const existing =
await Author.findById(req.params.id);



if(!existing)

return res.status(404).json({
error:'Not found'
});



const {
name,
bio,
email,
twitter
}=req.body;



let profile_image =
existing.profile_image;




if(req.file){


const uploadResult =
await uploadToCloudinary(
req.file.buffer,
'authors'
);


profile_image =
uploadResult.secure_url;


}



await Author.findByIdAndUpdate(

req.params.id,

{

name,

bio,

email,

twitter,

profile_image

}

);



res.json({

message:'Author updated'

});



}catch(err){

res.status(500).json({
error:err.message
});

}

});








// DELETE AUTHOR

router.delete(
'/authors/:id',
auth,
requireRole('Admin'),

async(req,res)=>{

try{


await Author.findByIdAndDelete(
req.params.id
);



await AuditLog.create({

username:req.user.username,

action:`Deleted author ID: ${req.params.id}`

});



res.json({
message:'Deleted'
});


}catch(err){

res.status(500).json({
error:err.message
});

}

});






// ================= COMMENTS =================



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
(parseInt(page)-1)
*
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

created_at:
c.createdAt

}))

);



}catch(err){

res.status(500).json({
error:err.message
});

}


});






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
error:'Comment text required'
});



const c =
await Comment.create({

story_id,

parent_id:
parent_id || null,

name:
name?.trim() || 'BANYA',

email:email || '',

comment:
comment.trim()

});



res.status(201).json({

id:c._id,

message:'Comment submitted'

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







// CREATE VIDEO WITH CLOUDINARY THUMBNAIL


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



let thumbnail='';



if(req.file){


const result =
await uploadToCloudinary(
req.file.buffer,
'videos'
);


thumbnail =
result.secure_url;


}





let embedUrl =
youtube_url;



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

category:
category || 'General'

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


// GET ACTIVE ADS

router.get('/ads', async(req,res)=>{

try{


const {
position
}=req.query;


const query={
active:true
};


if(position)

query.position=position;



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







// GET ALL ADS ADMIN

router.get('/ads/all',
auth,

async(req,res)=>{


try{


const ads =
await Ad.find({})
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







// CREATE AD WITH CLOUDINARY


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



let file='';

let cloudinary_public_id='';





if(req.file){



const result =
await uploadToCloudinary(

req.file.buffer,

'ads'

);



file =
result.secure_url;


cloudinary_public_id =
result.public_id;


}





const ad =
await Ad.create({

type:type || 'image',

file,

cloudinary_public_id,

link:
link || '#',

position:
position || 'sidebar',

text:
text || '',

active:true

});





await AuditLog.create({

username:req.user.username,

action:'Created advertisement'

});





res.status(201).json({

id:ad._id,

message:'Ad created'

});



}catch(err){


console.log(err);


res.status(500).json({

error:err.message

});


}


});








// TOGGLE AD


router.put(
'/ads/:id/toggle',
auth,
requireRole('Admin'),

async(req,res)=>{


try{


const ad =
await Ad.findById(
req.params.id
);



if(!ad)

return res.status(404).json({

error:'Not found'

});



ad.active =
!ad.active;



await ad.save();



res.json({

active:ad.active

});



}catch(err){

res.status(500).json({

error:err.message

});

}


});









// DELETE AD


router.delete(
'/ads/:id',
auth,
requireRole('Admin'),

async(req,res)=>{


try{


await Ad.findByIdAndDelete(
req.params.id
);



await AuditLog.create({

username:req.user.username,

action:`Deleted ad ID: ${req.params.id}`

});



res.json({

message:'Deleted'

});



}catch(err){

res.status(500).json({

error:err.message

});

}


});








// ================= SUBSCRIBERS =================




router.post(
'/subscribe',

async(req,res)=>{


try{


const {
email,
name
}=req.body;



if(!email)

return res.status(400).json({

message:'Email required'

});




await Subscriber.create({

email:
email.toLowerCase().trim(),

name:name || ''

});



res.json({

status:'success',

message:'Subscribed successfully'

});



}catch(err){



if(err.code===11000)

return res.json({

status:'info',

message:'Already subscribed'

});



res.status(500).json({

error:err.message

});


}


});








router.get(
'/subscribers',

auth,

requireRole('Admin','Editor'),

async(req,res)=>{


try{


const subs =
await Subscriber.find({})
.sort({
createdAt:-1
})
.lean();



res.json(

subs.map(s=>({

...s,

id:s._id,

subscribed_at:
s.createdAt

}))

);



}catch(err){

res.status(500).json({

error:err.message

});

}


});









// ================= ANALYTICS =================



router.get(
'/analytics/overview',

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

status:'published'

}),



Story.aggregate([

{

$group:{

_id:null,

total:{

$sum:'$views'

}

}

}

]),



Comment.countDocuments({

status:'pending'

}),



Subscriber.countDocuments({}),




Story.find({

status:'published'

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

views:

views[0]?.total || 0,

pendingComments:comments,

subscribers,

trending:



trending.map(s=>({

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










// ================= AUDIT LOGS =================



router.get(

'/audit-logs',

auth,

requireRole('Admin'),

async(req,res)=>{


try{


const logs =

await AuditLog.find({})

.sort({

createdAt:-1

})

.limit(100)

.lean();




res.json(

logs.map(l=>({

...l,

id:l._id,

created_at:l.createdAt

}))

);



}catch(err){


res.status(500).json({

error:err.message

});


}


});









// ================= BREAKING NEWS =================



router.get(
'/breaking',

async(req,res)=>{


try{


const stories =

await Story.find({

status:'published'

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









module.exports = router;