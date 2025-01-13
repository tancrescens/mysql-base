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
app.use(express.urlencoded({ extended: false }));

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
    app.get('/', async (req, res) => {

        res.render('customers/index')
    });

    // ROUTE: Render customers
    app.get('/customers', async (req, res) => {
        let query = `SELECT * FROM Customers JOIN Companies ON Companies.company_id = Customers.company_id WHERE 1`;
        let bindings = [];
        const first_name = req.query.first_name;
        const last_name = req.query.last_name;

        if (first_name) {
            query += ` AND first_name LIKE ?`
            bindings.push(`%` + first_name + `%`);
        }
        if (last_name) {
            query += ` AND last_name LIKE ?`
            bindings.push(`%` + last_name + `%`);
        }

        const [customers] = await connection.execute({
            'sql': query,
            nestTables: true
        }, bindings);

        res.render('customers/customers', {
            'customers': customers,
            'searchTerms': req.query
        })
    });

    // ROUTE: Create customer
    app.get('/customers/create', async (req, res) => {
        let [companies] = await connection.execute('SELECT * from Companies');
        let [employees] = await connection.execute('SELECT * from Employees');
        res.render('customers/add', {
            'companies': companies,
            'employees': employees
        })
    })
    app.post('/customers/create', async (req, res) => {
        let { first_name, last_name, rating, company_id, employee_id } = req.body;
        let query = 'INSERT INTO Customers (first_name, last_name, rating, company_id) VALUES (?, ?, ?, ?)';
        let bindings = [first_name, last_name, rating, company_id];
        let [result] = await connection.execute(query, bindings);

        let newCustomerId = result.insertId;
        if (employee_id) {
            for (let id of employee_id) {
                let query = 'INSERT INTO EmployeeCustomer (employee_id, customer_id) VALUES (?, ?)';
                let bindings = [id, newCustomerId];
                await connection.execute(query, bindings);
            }
        }
        res.redirect('/customers');
    })


    // ROUTE: Update Customer's details in Customers DB
    // app.get('/customers/:customer_id/edit', async (req, res) => {
    //     let [customers] = await connection.execute('SELECT * from Customers WHERE customer_id = ?', [req.params.customer_id]);
    //     let [companies] = await connection.execute('SELECT * from Companies');
    //     let customer = customers[0];
    //     res.render('customers/edit', {
    //         'customer': customer,
    //         'companies': companies
    //     })
    // })
    // app.post('/customers/:customer_id/edit', async (req, res) => {
    //     let {first_name, last_name, rating, company_id} = req.body;
    //     let query = 'UPDATE Customers SET first_name=?, last_name=?, rating=?, company_id=? WHERE customer_id=?';
    //     let bindings = [first_name, last_name, rating, company_id, req.params.customer_id];
    //     await connection.execute(query, bindings);
    //     res.redirect('/customers');
    // })
    app.get('/customers/:customer_id/edit', async (req, res) => {
        let [employees] = await connection.execute('SELECT * from Employees');
        let [customers] = await connection.execute('SELECT * from Customers WHERE customer_id = ?', [req.params.customer_id]);
        let [companies] = await connection.execute('SELECT * from Companies');
        let [employeeCustomers] = await connection.execute('SELECT * from EmployeeCustomer WHERE customer_id = ?', [req.params.customer_id]);

        let customer = customers[0];
        let relatedEmployees = employeeCustomers.map(ec => ec.employee_id);

        res.render('customers/edit', {
            'customer': customer,
            'employees': employees,
            'companies': companies,
            'relatedEmployees': relatedEmployees
        })
    });
    app.post('/customers/:customer_id/edit', async (req, res) => {
        let { first_name, last_name, rating, company_id, employee_id } = req.body;

        let query = 'UPDATE Customers SET first_name=?, last_name=?, rating=?, company_id=? WHERE customer_id=?';
        let bindings = [first_name, last_name, rating, company_id, req.params.customer_id];
        await connection.execute(query, bindings);

        await connection.execute('DELETE FROM EmployeeCustomer WHERE customer_id = ?', [req.params.customer_id]);

        for (let id of employee_id) {
            let query = 'INSERT INTO EmployeeCustomer (employee_id, customer_id) VALUES (?, ?)';
            let bindings = [id, req.params.customer_id];
            await connection.execute(query, bindings);
        }

        res.redirect('/customers');
    });

    // ROUTE: Delete Customer
    app.get('/customers/:customer_id/delete', async function (req, res) {
        const customer_id = req.params.customer_id;
        // NOTE: To delete customers we have to delete all their relationship first
        const [relatedEmployees] = await connection.execute(
            "SELECT * FROM EmployeeCustomer WHERE customer_id =?",
            [customer_id]);

        if (relatedEmployees.length > 0) {
            res.render('errors', {
                'errorMessage': "There are still employees serving this customers, hence we cannot delete"
            })
            return;
        }

        // display a confirmation form if there are no existing employees serving selected customer
        const [customers] = await connection.execute(
            "SELECT * FROM Customers WHERE customer_id = ?", [customer_id]
        );
        const customer = customers[0];

        res.render('customers/delete', {
            customer
        });
    });
    app.post('/customers/:customer_id/delete', async function (req, res) {
        const customer_id = req.params.customer_id;
        try {
            await connection.execute(`DELETE FROM Customers WHERE customer_id = ?`, [customer_id]);
            res.redirect('/customers');
        } catch (e) {
            res.render("errors", {
                "errorMessage": "Unable to delete Customer"
            });
        }
    });


    // END
    app.listen(3000, () => {
        console.log('Server is running')
    });
}

main();