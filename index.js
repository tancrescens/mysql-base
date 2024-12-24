require('dotenv').config();
const express = require('express');
const hbs = require('hbs');
const wax = require('wax-on');
// require in handlebars and their helpers
const helpers = require('handlebars-helpers');

let app = express();

// app.set('view engine', 'hbs');
// app.use(express.static('public'));
// app.use(express.urlencoded({extended:false}));

// wax.on(hbs.handlebars);
// wax.setLayoutPath('./views/layouts');


// // tell handlebars-helpers where to find handlebars
// helpers({
//     'handlebars': hbs.handlebars
// })

app.get('/', (req,res) => {
    res.send('Hello, World!');
});

app.listen(3000, ()=>{
    console.log('Server is running')
});