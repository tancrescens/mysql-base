require('dotenv').config();
const express = require('express');
const hbs = require('hbs');
const wax = require('wax-on');
// require in handlebars and their helpers
const helpers = require('handlebars-helpers');
const { createConnection } = require('mysql2/promise');

let app = express();

app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.urlencoded({extended:false}));

wax.on(hbs.handlebars);
wax.setLayoutPath('./views/layouts');

// tell handlebars-helpers where to find handlebars
helpers({
    'handlebars': hbs.handlebars
});

let connection;

async function main() {
    connection = await createConnection({
        'host': process.env.DB_HOST,
        'user': process.env.DB_USER,
        'database': process.env.DB_NAME,
        'password': process.env.DB_PASSWORD
    });

    // ROUTE: Default
    app.get('/', (req,res) => {
        res.send('Hello, World!');
    });

    // ROUTE: Render one row / customer
    app.get('/customers', async (req, res) => {
        const [customers] = await connection.execute({
            'sql':`
            SELECT * from Customers
                JOIN Companies ON Customers.company_id = Companies.company_id;
            `,
            nestTables: true

        });        res.render('customers/index', {
            'customers': customers
        })
        console.log(customers)
    });
    
    // ROUTE: create customers in Customers DB
    app.get("/customers/create", async (req,res)=>{
        let [companies] = await connection.execute(`SELECT * from Companies`);
        console.log(companies)
        res.render("customers/add", {
            "companies" : companies
        });
    });

    
    // END
    app.listen(3000, ()=>{
        console.log('Server is running')
    });
}

main();