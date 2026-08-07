const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({

name:{
type:String,
required:false
},

email:{
type:String,
required:true,
unique:true
},

active:{
type:Boolean,
default:true
}

},{
timestamps:true
});


module.exports = mongoose.model(
"Subscriber",
subscriberSchema
);
