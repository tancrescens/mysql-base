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
    });
    
    // ROUTE: create customers in Customers DB
    app.get("/customers/create", async (req,res)=>{
        let [companies] = await connection.execute(`SELECT * from Companies`);
        res.render("customers/add", {
            "companies" : companies
        });
    });
    app.post('/customers/create', async(req,res)=>{
        let {first_name, last_name, rating, company_id} = req.body;
        let query = 'INSERT INTO Customers (first_name, last_name, rating, company_id) VALUES (?, ?, ?, ?)';
        let bindings = [first_name, last_name, rating, company_id];
        await connection.execute(query, bindings);
        res.redirect('/customers');
    })
    
    // ROUTE: Update Customer's details in Customers DB
    app.get('/customers/:customer_id/edit', async (req, res) => {
        let [customers] = await connection.execute('SELECT * from Customers WHERE customer_id = ?', [req.params.customer_id]);
        let [companies] = await connection.execute('SELECT * from Companies');
        let customer = customers[0];
        res.render('customers/edit', {
            'customer': customer,
            'companies': companies
        })
    })
    app.post('/customers/:customer_id/edit', async (req, res) => {
        let {first_name, last_name, rating, company_id} = req.body;
        let query = 'UPDATE Customers SET first_name=?, last_name=?, rating=?, company_id=? WHERE customer_id=?';
        let bindings = [first_name, last_name, rating, company_id, req.params.customer_id];
        await connection.execute(query, bindings);
        res.redirect('/customers');
    })
    
    // END
    app.listen(3000, ()=>{
        console.log('Server is running')
    });
}

main();