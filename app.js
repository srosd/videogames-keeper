//DEPENDENCIES
const express    = require('express');
const chalk      = require('chalk');
const hbs        = require('hbs');
const dotenv     = require('dotenv');
const mongoose   = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt     = require('bcrypt');
const session    = require('express-session');
const MongoStore = require('connect-mongo')(session)

//CONSTANTS
const app = express();

// MODELS
const Videogame = require('./models/Videogame.js');
const User = require('./models/User.js');

//CONFIGURATION
// Configuración de .env
require('dotenv').config();

// Configuración de mongoose
mongoose.connect(`mongodb://localhost/${process.env.DATABASE}`, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
.then((result)=>{
    console.log(chalk.yellowBright.inverse.bold(`Connected to Mongo! Database used: ${result.connections[0].name}`));
})
.catch((err)=>{
    console.log(chalk.red.inverse.bold(err));
});


// Configuración de hbs
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

// Configuración del body parser:
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración carpeta estática:
app.use(express.static(__dirname + '/public'));

// Configuración de cookies:
app.use(session({
    secret: "basic-auth-secret",
    cookie: { maxAge: 60000 },
    saveUninitialized: true,
    resave: true,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
      ttl: 24 * 60 * 60 // 1 day
    })
  }));
  


//ROUTES
app.get('/', (req, res, next)=>{
                
    res.render('home');
});

app.get('/new-videogame', (req, res, next)=>{
    res.render('newVideogame');
});

app.post('/new-videogame', (req, res, next)=>{

    const splitString = (_string)=>{
        const theString = _string;
        const splittedString = theString.split(',');
        return splittedString;
    };

    const arrayPlatform = splitString(req.body.platform);
    const arrayGenre = splitString(req.body.genre);
    

    const newVideogame = {...req.body, genre: arrayGenre, platform: arrayPlatform};

    Videogame.create(newVideogame)
             .then((result)=>{
                 console.log(result);
                 res.redirect('all-videogames');
                })
             .catch((err)=>{console.log(err);});
});

app.get('/all-videogames', (req, res, next)=>{

    Videogame.find({}, {name: 1, imageUrl: 1, _id: 1}, {sort: {rating: -1}})
             .then((videogames)=>{
                 res.render('allVideogames', {videogames});
             })
             .catch((err)=>{
                 console.log(err);
                 res.send(err);
             })
})

app.get('/videogame/:id', (req, res, next)=>{
    const videogameID = req.params.id;
    
    Videogame.findById(videogameID)
            .then((videogame)=>{
                res.render('singleVideogame', videogame);
            })
            .catch((err)=>{
                 console.log(err);
                res.send(err);
            });
});

app.post('/delete-game/:id', (req, res, next)=>{
    const id = req.params.id;
    Videogame.findByIdAndDelete(id)
            .then(() => {
                res.redirect('/all-videogames');
            }).catch((err) => {
                console.log(err);
                res.send(err);
            });
});

app.get('/edit-videogame/:id', (req, res, next)=>{
    const _id = req.params.id;
    Videogame.findById(_id)
            .then((result)=>{
                res.render('editForm', result);
            })
            .catch((err)=>{
                console.log(err);
                res.send(err);
            })
});

app.post('/edit-videogame/:id', (req, res, next)=>{

    const _id = req.params.id;
    const editedVideogame = req.body;

    Videogame.findByIdAndUpdate(_id, editedVideogame)
        .then(()=>{
            res.redirect(`/videogame/${_id}`)
        })
        .catch((err)=>{
            console.log(err);
            res.send(err);
        })
});

app.get('/sign-up', (req, res, next)=>{
    res.render('signUp');
});

app.post('/sign-up', (req, res, next)=>{
    const {email, password} = req.body;

    User.findOne({email: email})
        .then((result)=>{
            if(!result){
                bcrypt.genSalt(10)
                    .then((salt)=>{
                        bcrypt.hash(password, salt)
                            .then((hashedPassword)=>{
                                const hashedUser = {email: email, password: hashedPassword};
                                User.create(hashedUser)
                                    .then((result)=>{
                                        res.redirect('/')
                                    });
                            });
                    })
                    .catch((err)=>{
                        console.log(err);
                        res.send(err);
                    })
            } else {
                res.render('login', {errorMessage: 'Este usuario ya existe.'})
            }
        });
    
    
});

app.get('/log-in', (req, res, next)=>{
    res.render('login');
});

app.post('/log-in', (req, res, next)=>{
    const {email, password} = req.body;
    User.findOne({email: email})
        .then((result)=>{
            if(!result) {
                res.render('login', {errorMessage: 'Este usuario no existe. Lo sentimos.'})
            }
            else {
                bcrypt.compare(password, result.password)
                    .then((resultFromBcrypt)=>{
                        if(resultFromBcrypt){
                            req.session.currentUser = email;
                            console.log(req.session);
                            res.redirect('/');
                        } else {
                            res.render('login', {errorMessage: 'Contraseña incorrecta. Vuelva a intentarlo.'})
                        }
                    })
            }
        })
        .catch((err)=>{
            console.log(err);
        });

    
});

//LISTENER
app.listen(process.env.PORT, ()=>{
    console.log(chalk.blueBright.inverse.bold(`Connected on Port ${process.env.PORT}!`));
});
