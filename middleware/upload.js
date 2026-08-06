const multer = require('multer');
const path = require('path');


const storage = multer.memoryStorage();


const fileFilter = (req,file,cb)=>{

const allowed =
/jpeg|jpg|png|gif|webp|mp4|webm/;


if(
allowed.test(
path.extname(file.originalname).toLowerCase()
)
){

cb(null,true);

}else{

cb(new Error('Invalid file type'));

}

};


module.exports = multer({

storage,

fileFilter,

limits:{
fileSize:50*1024*1024
}

});