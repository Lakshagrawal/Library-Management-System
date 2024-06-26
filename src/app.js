require('dotenv').config()
const express = require("express")
const app = express()
const path = require("path")
const mongoose = require("mongoose")
const hbs = require('hbs')
const session = require('express-session');


const  bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({
    extended:true
}))

// Set view engine to hbs
app.set('view engine','hbs')
app.set('views',path.join(__dirname,'/views'))
hbs.handlebars.registerHelper('eq', function(a,b) {
    return a===b;
})

hbs.handlebars.registerHelper('formatDate', function(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    // console.log(year,month,day)
    return `${year}-${month}-${day}`;

})

// static file use 
app.use('/static',express.static(path.join(__dirname,'../public')));

// Define routes
app.get('/', (req, res) => {
    // res.send("hello")
    res.render('home', { title: 'Welcome to my Express App' });
});

// app.use(session({
//     secret:process.env.SESSION_KEY || "hellothisissessionkey",
//     resave: false,
//     saveUninitialized: true
// }));

// use of routes
const vendor = require("./routes/vendor")
app.use('/vendor',vendor); 
const user = require("./routes/user")
app.use('/user',user);
const admin = require("./routes/admin")
app.use('/admin',admin); 


// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { title: 'Error', message: 'Something went wrong!' });
});

try{
    const dbURL =  process.env.SERVER_DB_KEY || "mongodb://localhost:27017/bookstore";  
    // console.log(dbURL);

    mongoose.connect(dbURL).then(()=>{
        console.log("db is connected succsesfully");
    }).catch((err)=>{
        console.log(err);
    })
}catch(err){
    console.log(err);
}

const port = process.env.APP_PORT || 3000;
// Start server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
