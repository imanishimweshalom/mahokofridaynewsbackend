const mongoose = require('mongoose');
const { Schema } = mongoose;


// ─── AUTHOR ──────────────────────────────────────────────────────────────────
const authorSchema = new Schema({

  name:{
    type:String,
    required:true,
    trim:true
  },

  bio:{
    type:String,
    default:''
  },

  profile_image:{
    type:String,
    default:''
  },

  email:{
    type:String,
    default:''
  },

  twitter:{
    type:String,
    default:''
  }

},{timestamps:true});





// ─── STORY ───────────────────────────────────────────────────────────────────
const storySchema = new Schema({

  title:{
    type:String,
    required:true,
    trim:true
  },

  slug:{
    type:String,
    unique:true,
    sparse:true
  },

  category:{
    type:String,
    required:true
  },

  subcategory:{
    type:String,
    default:''
  },

  description:{
    type:String,
    default:''
  },


  // Cloudinary URL
  image:{
    type:String,
    default:''
  },


  author:{
    type:String,
    default:'Editorial Team'
  },


  author_id:{
    type:Schema.Types.ObjectId,
    ref:'Author',
    default:null
  },


  author_image:{
    type:String,
    default:''
  },


  author_bio:{
    type:String,
    default:''
  },


  tags:{
    type:String,
    default:''
  },


  meta_description:{
    type:String,
    default:''
  },


  views:{
    type:Number,
    default:0
  },


  likes:{
    type:Number,
    default:0
  },


  dislikes:{
    type:Number,
    default:0
  },


  status:{
    type:String,
    enum:[
      'published',
      'draft',
      'scheduled'
    ],
    default:'published'
  },


  scheduled_at:{
    type:Date,
    default:null
  },


  featured:{
    type:Boolean,
    default:false
  },


  cloudinary_public_id:{
    type:String,
    default:''
  }


},{timestamps:true});



storySchema.index({category:1});
storySchema.index({status:1});
storySchema.index({createdAt:-1});
storySchema.index({views:-1});
storySchema.index({
  title:'text',
  description:'text'
});






// ─── COMMENT ─────────────────────────────────────────────────────────────────
const commentSchema = new Schema({

  story_id:{
    type:Schema.Types.ObjectId,
    ref:'Story',
    required:true
  },


  parent_id:{
    type:Schema.Types.ObjectId,
    ref:'Comment',
    default:null
  },


  name:{
    type:String,
    default:'BANYA'
  },


  email:{
    type:String,
    default:''
  },


  comment:{
    type:String,
    required:true
  },


  status:{
    type:String,
    enum:[
      'pending',
      'approved',
      'spam'
    ],
    default:'pending'
  },


  likes:{
    type:Number,
    default:0
  },


  dislikes:{
    type:Number,
    default:0
  }


},{timestamps:true});








// ─── AD ──────────────────────────────────────────────────────────────────────
const adSchema = new Schema({

  type:{
    type:String,
    enum:[
      'image',
      'video'
    ],
    default:'image'
  },


  // Cloudinary URL
  file:{
    type:String,
    default:''
  },


  cloudinary_public_id:{
    type:String,
    default:''
  },


  link:{
    type:String,
    default:'#'
  },


  position:{
    type:String,
    enum:[
      'top',
      'sidebar',
      'inline',
      'popup'
    ],
    default:'sidebar'
  },


  text:{
    type:String,
    default:''
  },


  active:{
    type:Boolean,
    default:true
  }


},{timestamps:true});








// ─── SUBSCRIBER ──────────────────────────────────────────────────────────────
const subscriberSchema = new Schema({

 email:{
  type:String,
  unique:true,
  required:true,
  lowercase:true,
  trim:true
 },


 name:{
  type:String,
  default:''
 },


 status:{
  type:String,
  enum:[
    'active',
    'unsubscribed'
  ],
  default:'active'
 }


},{timestamps:true});









// ─── VIDEO ───────────────────────────────────────────────────────────────────
const videoSchema = new Schema({

 title:{
  type:String,
  required:true
 },


 youtube_url:{
  type:String,
  default:''
 },


 // Cloudinary video URL
 video_url:{
  type:String,
  default:''
 },


 thumbnail:{
  type:String,
  default:''
 },


 cloudinary_public_id:{
  type:String,
  default:''
 },


 category:{
  type:String,
  default:'General'
 },


 views:{
  type:Number,
  default:0
 }


},{timestamps:true});









// ─── ADMIN USER ──────────────────────────────────────────────────────────────
const adminUserSchema = new Schema({

 username:{
  type:String,
  unique:true,
  required:true
 },


 email:{
  type:String,
  unique:true,
  sparse:true
 },


 password:{
  type:String,
  required:true
 },


 role:{
  type:String,
  enum:[
   'Admin',
   'Editor',
   'Journalist',
   'Moderator'
  ],
  default:'Journalist'
 },


 avatar:{
  type:String,
  default:''
 },


 active:{
  type:Boolean,
  default:true
 },


 last_login:{
  type:Date
 }


},{timestamps:true});








// ─── AUDIT LOG ───────────────────────────────────────────────────────────────
const auditLogSchema = new Schema({

 username:{
  type:String
 },


 action:{
  type:String
 },


 ip_address:{
  type:String,
  default:''
 }


},{timestamps:true});








module.exports = {

 Author:
 mongoose.model('Author',authorSchema),

 Story:
 mongoose.model('Story',storySchema),

 Comment:
 mongoose.model('Comment',commentSchema),

 Ad:
 mongoose.model('Ad',adSchema),

 Subscriber:
 mongoose.model('Subscriber',subscriberSchema),

 Video:
 mongoose.model('Video',videoSchema),

 AdminUser:
 mongoose.model('AdminUser',adminUserSchema),

 AuditLog:
 mongoose.model('AuditLog',auditLogSchema)

};