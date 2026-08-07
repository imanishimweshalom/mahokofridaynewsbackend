
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./db');

const app = express();

const PORT = process.env.PORT || 5000;

// ================= CORS =================

const allowedOrigins = [

  'https://mahokofridaynews.onrender.com',

  'http://localhost:3000'

];

app.use(cors({

  origin: (origin, callback) => {

    if (!origin)

      return callback(null, true);


    if (allowedOrigins.includes(origin))

      return callback(null, true);


    return callback(null, false);

  },

  credentials: true,

  methods: [

    'GET',

    'POST',

    'PUT',

    'DELETE',

    'PATCH',

    'OPTIONS'

  ],

  allowedHeaders: [

    'Content-Type',

    'Authorization'

  ]

}));


app.options('*', cors());



// ================= SECURITY =================

app.use(

  helmet({

    crossOriginResourcePolicy: {

      policy: 'cross-origin'

    }

  })

);



// ================= BODY =================

app.use(express.json({

  limit: '10mb'

}));


app.use(express.urlencoded({

  extended: true,

  limit: '10mb'

}));



// ================= RATE LIMIT =================

app.use(

  '/api/auth/login',

  rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 10,

    message: {

      error: 'Too many login attempts. Try again later.'

    }

  })

);



app.use(

  '/api/',

  rateLimit({

    windowMs: 60 * 1000,

    max: 300

  })

);



// ================= FILES =================

app.use(

  '/uploads',

  express.static(

    path.join(__dirname, 'uploads')

  )

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



// ================= HEALTH =================

app.get('/health', (req, res) => {

  res.json({

    status: 'ok',

    db: 'mongodb',

    time: new Date()

  });

});



// ================= 404 =================

app.use((req, res) => {

  res.status(404).json({

    error: 'Route not found'

  });

});



// ================= ERROR =================

app.use((err, req, res, next) => {

  console.error(err);

  res.status(500).json({

    error:

      process.env.NODE_ENV === 'production'

        ?

        'Internal server error'

        :

        err.message

  });

});



// ================= START =================

const start = async () => {

  try {

    await connectDB();



    app.listen(PORT, () => {

      console.log(

        `🚀 MFN Backend running on port ${PORT}`

      );

      console.log(

        `📦 Database connected`

      );

    });

  } catch (err) {

    console.error(

      'Server startup error:',

      err

    );

    process.exit(1);

  }

};



start();

