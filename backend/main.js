require('dotenv').config();
const { createServer } = require('http');

const hostname = '0.0.0.0';
const port = process.env.PORT;
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');

const db = require(path.join(__dirname, '..', 'db', 'connection'));
const apidb = require(path.join(__dirname, '..', 'db', 'apidatabase'));
const SECRET_KEY = process.env.JWT_SECRET; 

app.use(express.json());
app.use(express.static('public'));


/*LOGIN & REGISTER API*/

router.post('/login', async (req, res) => {
    const { username, pass } = req.body;

    try {
        const select_query = 'SELECT * FROM accounts WHERE username = $1';
        const get_id = await db.query('SELECT "student-id" FROM accounts WHERE username = $1', [username]);
        const get_link = await db.query('SELECT img_link FROM accounts WHERE username = $1', [username]);
        const result = await db.query(select_query, [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = result.rows[0];
        const user_id = get_id.rows[0].id;
        const img_link = get_link.rows[0].get_link;
        const isMatch = await bcrypt.compare(pass, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }


        const token = jwt.sign(
            { userId: user_id, username: user.username, email: user.email, img_link: img_link},
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        console.log('User logged in successfully');
        let redirectPath = '/dashboard';

        if (user.role === 'admin') {
            redirectPath = '/admin_dashboard';
        }

        res.status(200).json({
            success: true,
            token,
            redirect: redirectPath
        });


    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

router.post('/register', async (req, res) => {
    const { username, fname, student_id, email, pass } = req.body;
    usernameStore = username;

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(pass, saltRounds);

        const insert_query = 'INSERT INTO accounts (username, "full-name", "student-id", password, email) VALUES ($1, $2, $3, $4, $5)';
        const result = await db.query(insert_query, [username, fname, student_id, hashedPassword, email]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: error.message });


    }

});

/*RECEIVE ORDERS API*/
router.get('/receiveAccounts', async (req, res) => {

    try {
        const result = await apidb.query(
            'SELECT * FROM accounts'
        );

        
        res.status(200).json(result.rows);
    const accounts = result.rows[0];
        console.log(`accounts`);
    } catch (err) {
        console.error("DETAILED ERROR:", err);
        res.status(500).json({
            message: 'Login error'
        });
    }
});


router.post('/addOrder', async (req, res) => {
    const { username, id, name, description, date, paymentMethod, status } = req.body;
 const wow = "Wow";
    try {

        const insert_query = 'INSERT INTO orders (order_name, order_description, order_date, "order_paymentMethod", "order_status", "order_imgLink", username, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
        const result = await db.query(insert_query, [name, description, date, paymentMethod, status, wow, username, id]);

        res.status(201).json({ message: 'Order added successfully' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: error.message });


    }
});

router.get('/getAllOrders',  async (req, res) => {
    try {
        const query = `
            SELECT * FROM orders`;

        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user books:', error);
        res.status(500).json({ message: 'Error fetching books' });
    }
});

router.get('/getAllShipping',  async (req, res) => {
    try {
        const query = `
            SELECT * FROM orders WHERE order_status='Shipping'
            `;

        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

router.get('/getAllReceived',  async (req, res) => {
    try {
        const query = `
            SELECT * FROM orders WHERE order_status='Received'
            `;

        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

router.get('/getAllReturned',  async (req, res) => {
    try {
        const query = `
            SELECT * FROM orders WHERE order_status='Returned'
            `;

        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }

        req.user = user;
        next();
    });
    console.log("AUTH HEADER:", authHeader);
    console.log("TOKEN:", token);
}
    function authenticateAdmin(req, res, next) {

    const authHeader = req.headers['authorization'];

    const token =
        authHeader && authHeader.split(' ')[1];

    if (!token) {

        return res.status(401).json({
            message: 'No token'
        });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {

        if (err) {

            return res.status(403).json({
                message: 'Invalid token'
            });
        }

        if (user.role !== 'admin') {

            return res.status(403).send('Access denied');
        }

        req.user = user;

        next();
    });
}

app.use(router);
app.get('/login',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'login.html'));
});
app.get('/register',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'dashboard.html'));
});

app.get('/orders',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'orders.html'));
});

app.get('/orderstest',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'orderstest.html'));
});

app.get('/add',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'add.html'));
});
app.get('/test',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'test.html'));
});


app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});