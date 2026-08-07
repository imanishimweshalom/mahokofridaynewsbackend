require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./db');

const app = express();


// ================= RENDER PROXY =================

app.set('trust proxy', 1);


// ================= PORT =================

const PORT = process.env.PORT || 5000;


// ================= CORS =================

const allowedOrigins = [
  'https://mahokofridaynews.onrender.com',
  'http://localhost:3000'
];


app.use(
  cors({

    origin: function(origin, callback){

      // Allow Postman / mobile apps / server requests
      if(!origin){
        return callback(null, true);
      }


      if(allowedOrigins.includes(origin)){
        return callback(null, true);
      }


      console.log(
        'Blocked by CORS:',
        origin
      );


      return callback(null, false);

    },


    credentials:true,


    methods:[
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],


    allowedHeaders:[
      'Content-Type',
      'Authorization'
    ]

  })
);


app.options(
  '*',
  cors()
);



// ================= SECURITY =================

app.use(
  helmet({

    crossOriginResourcePolicy:{
      policy:'cross-origin'
    }

  })
);



// ================= BODY =================

app.use(
  express.json({
    limit:'10mb'
  })
);


app.use(
  express.urlencoded({
    extended:true,
    limit:'10mb'
  })
);



// ================= RATE LIMIT =================

const apiLimiter = rateLimit({

  windowMs:60 * 1000,

  max:300,

  message:{
    error:'Too many requests'
  }

});


const loginLimiter = rateLimit({

  windowMs:15 * 60 * 1000,

  max:10,

  message:{
    error:'Too many login attempts. Try again later.'
  }

});


app.use(
  '/api/auth/login',
  loginLimiter
);


app.use(
  '/api',
  apiLimiter
);



// ================= UPLOADS =================

app.use(
  '/uploads',
  express.static(
    path.join(__dirname,'uploads')
  )
);



// ================= HEALTH CHECK =================

app.get(
  '/health',
  (req,res)=>{

    res.status(200).json({

      status:'ok',

      service:'MFN Backend',

      database:'MongoDB',

      time:new Date().toISOString()

    });

  }
);



// ================= ROUTES =================


app.use(
  '/api/auth',
  require('./routes/auth')
);


app.use(
  '/api/stories',
  require('./routes/stories')
);


app.use(
  '/api',
  require('./routes/api')
);



// ================= 404 =================


app.use(
  (req,res)=>{

    res.status(404).json({

      error:'Route not found',

      path:req.originalUrl

    });

  }
);



// ================= ERROR HANDLER =================


app.use(
  (err,req,res,next)=>{

    console.error(
      'SERVER ERROR:',
      err.stack || err
    );


    res.status(500).json({

      error:
      process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message

    });

  }
);



// ================= START SERVER =================


const start = async()=>{

  try{


    console.log(
      'Starting MFN Backend...'
    );


    console.log(
      'Connecting to MongoDB...'
    );


    await connectDB();


    console.log(
      'MongoDB connected successfully'
    );


    app.listen(
      PORT,
      '0.0.0.0',
      ()=>{

        console.log(
          `🚀 MFN Backend running on port ${PORT}`
        );

      }
    );


  }catch(error){


    console.error(
      '❌ Startup failed:',
      error
    );


    process.exit(1);

  }

};


start();