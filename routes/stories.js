const router = require('express').Router();
const slugify = require('slugify');

const {
  Story,
  Author,
  AuditLog
} = require('../models');

const {
  auth,
  requireRole
} = require('../middleware/auth');

const upload = require('../middleware/upload');
const uploadToCloudinary = require('../middleware/cloudinaryUpload');


// ================= GET ALL STORIES =================

router.get('/', async (req,res)=>{

try{

const {
category,
search,
page=1,
limit=12,
status='published',
featured
}=req.query;


const query={};


if(status)
query.status=status;

if(category)
query.category=category;

if(featured)
query.featured=true;

if(search)
query.$text={
$search:search
};


const skip=(Number(page)-1)*Number(limit);



const [stories,total]=await Promise.all([

Story.find(query)
.populate(
'author_id',
'profile_image bio name twitter'
)
.sort({
createdAt:-1
})
.skip(skip)
.limit(Number(limit))
.lean(),


Story.countDocuments(query)

]);



const mapped=stories.map(s=>({

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


created_at:s.createdAt,

updated_at:s.updatedAt

}));



res.json({

stories:mapped,

total,

page:Number(page),

pages:Math.ceil(total/Number(limit))

});


}catch(err){

res.status(500).json({
error:err.message
});

}

});





// ================= POPULAR STORIES =================


router.get('/stats/popular', async(req,res)=>{

try{


const {
category,
limit=5
}=req.query;


const query={
status:'published'
};


if(category)
query.category=category;



const stories=await Story.find(query)

.select(
'title image category views createdAt'
)

.sort({
views:-1
})

.limit(Number(limit))

.lean();



res.json(

stories.map(s=>({

...s,

id:s._id,

created_at:s.createdAt

}))

);



}catch(err){

res.status(500).json({
error:err.message
});

}

});





// ================= STORIES BY AUTHOR =================


router.get('/authors/:id/stories',async(req,res)=>{

try{


const stories=await Story.find({

author_id:req.params.id,

status:'published'

})

.sort({
createdAt:-1
})

.lean();



res.json({

stories:stories.map(s=>({

...s,

id:s._id,

created_at:s.createdAt

}))

});


}catch(err){

res.status(500).json({
error:err.message
});

}

});







// ================= SINGLE STORY =================


router.get('/:id',async(req,res)=>{


try{


const story = await Story.findById(req.params.id)

.populate(
'author_id',
'profile_image bio name twitter'
)

.lean();



if(!story)

return res.status(404).json({

error:'Story not found'

});




// increase views

await Story.findByIdAndUpdate(

req.params.id,

{
$inc:{
views:1
}
}

);



res.json({

...story,

id:story._id,


author_avatar:
story.author_id?.profile_image ||
story.author_image ||
'',


author_bio_full:
story.author_id?.bio ||
story.author_bio ||
'',


author_twitter:
story.author_id?.twitter ||
'',


created_at:story.createdAt


});



}catch(err){

res.status(500).json({
error:err.message
});

}

});







// ================= CREATE STORY =================


router.post(
'/',
auth,
requireRole('Admin','Editor','Journalist'),
upload.single('image'),

async(req,res)=>{


try{


const {

title,

category,

subcategory,

description,

author_id,

tags,

meta_description,

status,

scheduled_at,

featured


}=req.body;



let image='';



if(req.file){


const result=
await uploadToCloudinary(
req.file.buffer,
'stories'
);


image=result.secure_url;

}



let authorName='Editorial Team';



if(author_id){


const author=
await Author.findById(author_id);


if(author)

authorName=author.name;


}



const story=await Story.create({


title,


slug:

slugify(title,{
lower:true,
strict:true
})+'-'+Date.now(),



category,


subcategory:subcategory || '',


description,


image,


author:authorName,


author_id:author_id || null,


tags:tags || '',


meta_description:meta_description || '',


status:status || 'published',


scheduled_at:scheduled_at || null,


featured:

featured==='true' ||
featured===true



});




await AuditLog.create({

username:req.user.username,

action:`Created story: ${title}`

});



res.status(201).json({

id:story._id,

message:'Story created successfully'

});



}catch(err){

res.status(500).json({
error:err.message
});

}


});







// ================= UPDATE STORY =================


router.put(
'/:id',
auth,
requireRole('Admin','Editor'),
upload.single('image'),

async(req,res)=>{


try{


const existing=
await Story.findById(req.params.id);



if(!existing)

return res.status(404).json({
error:'Not found'
});



let image=existing.image;



if(req.file){


const result=
await uploadToCloudinary(
req.file.buffer,
'stories'
);


image=result.secure_url;

}



let authorName=existing.author;



if(req.body.author_id){


const author=
await Author.findById(req.body.author_id);


if(author)

authorName=author.name;


}




await Story.findByIdAndUpdate(

req.params.id,

{


...req.body,


image,


author:authorName,


featured:

req.body.featured==='true' ||
req.body.featured===true


}

);




res.json({

message:'Story updated successfully'

});



}catch(err){

res.status(500).json({
error:err.message
});

}


});








// ================= DELETE =================


router.delete(
'/:id',
auth,
requireRole('Admin'),

async(req,res)=>{


try{


await Story.findByIdAndDelete(
req.params.id
);



await AuditLog.create({

username:req.user.username,

action:`Deleted story ID: ${req.params.id}`

});



res.json({

message:'Deleted successfully'

});


}catch(err){

res.status(500).json({
error:err.message
});

}

});







// ================= REACTION =================


router.post('/:id/react',async(req,res)=>{


try{


const {
type
}=req.body;



if(!['likes','dislikes'].includes(type))

return res.status(400).json({

error:'Invalid reaction type'

});



const story=

await Story.findByIdAndUpdate(

req.params.id,

{

$inc:{
[type]:1
}

},

{
new:true
}

)

.select(
'likes dislikes'
);



if(!story)

return res.status(404).json({

error:'Story not found'

});



res.json({

likes:story.likes,

dislikes:story.dislikes

});



}catch(err){

res.status(500).json({
error:err.message
});

}


});




module.exports = router;