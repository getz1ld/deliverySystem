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
/*const apidb = require(path.join(__dirname, '..', 'db', 'apidatabase'));*/
const SECRET_KEY = process.env.JWT_SECRET; 

app.use(express.json());
app.use(express.static('public'));

const storage_profilepicture = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'public', 'frontend', 'img', 'profile_picture');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload_profilepicture = multer({ storage: storage_profilepicture});

/*FOR THE PROFILE PICTURE API*/
router.post('/updateProfilePicture', upload_profilepicture.single('profile_img'), authenticateToken, async (req, res) => {

    const img_link = `frontend/img/profile_picture/${req.file.filename}`;
    const userId = req.user.userId;
    try {
        const query = `
            UPDATE accounts SET img_link = $1 WHERE user_id = $2;
        `;
        await db.query(query, [img_link, userId]);

        res.status(201).json({ message: 'Profile Picture update successfully', imageUrl: img_link });
    } catch (error) {
        console.error('Error adding book:', error);
        res.status(500).json({ message: 'Error updating profile picture' });
    }
});

app.get('/getProfilePicture', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        const result = await db.query('SELECT img_link FROM accounts WHERE user_id = $1', [userId]);
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('Error fetching profile picture:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/*LOGIN & REGISTER API*/

router.post('/login', async (req, res) => {
    const { email, pass } = req.body;

    try {
        const select_query = 'SELECT * FROM accounts WHERE email = $1';
        const result = await db.query(select_query, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user_id = result.rows[0].user_id;
        const user_name = result.rows[0].username;
        const user_email = result.rows[0].email;
        const img_link = result.rows[0].img_link;
        const isMatch = await bcrypt.compare(pass, result.rows[0].password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }


        const token = jwt.sign(
            { userId: user_id, username: user_name, email: user_email, img_link: img_link},
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        console.log('User logged in successfully');
        let redirectPath = '/dashboard';

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
    const { username, fname, email, pass, contact, address } = req.body;
    usernameStore = username;

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(pass, saltRounds);

        const insert_query = 'INSERT INTO accounts (username, "full-name", email, password) VALUES ($1, $2, $3, $4)';
        const result = await db.query(insert_query, [username, fname, email, hashedPassword]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: error.message });


    }

});

router.get('/getOrderCount',  async (req, res) => {
    try {
        const totalOrders = await db.query('SELECT COUNT(*) FROM orders');
        const shippingOrders = await db.query('SELECT COUNT(*) FROM orders WHERE order_status = \'Shipping\'');
        const receivedOrders = await db.query('SELECT COUNT(*) FROM orders WHERE order_status = \'Received\'');
        const returnedOrders = await db.query('SELECT COUNT(*) FROM orders WHERE order_status = \'Returned\'');

        res.status(200).json({
            totalOrders: totalOrders.rows[0].count,
            shippingOrders: shippingOrders.rows[0].count,
            receivedOrders: receivedOrders.rows[0].count,
            returnedOrders: returnedOrders.rows[0].count
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ message: 'Error fetching user info' });
    }
});

router.get('/getProfileInfo', authenticateToken, async (req, res) => {
    const id = req.user.userId;
    try {
        const result = await db.query('SELECT * FROM accounts WHERE user_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ message: 'Error fetching user info' });
    }
});

/*RECEIVE ORDERS API*/
router.get('/receiveAccounts', async (req, res) => {

    try {
        const result = await apidb.query(
            'SELECT * FROM accounts'
        );

        
    const accounts = result.rows[0];

        
        res.status(200).json(accounts);
    } catch (err) {
        console.error("DETAILED ERROR:", err);
        res.status(500).json({
            message: 'Login error'
        });
    }
});
router.get('/receiveOrders', async (req, res) => {

    try {
        const result = await apidb.query(
            'SELECT * FROM orders'
        );

        res.status(200).json(result.rows);
    const orders = result.rows[0];

    
        console.log(`orders: ${JSON.stringify(orders)}`);
    } catch (err) {
        console.error("DETAILED ERROR:", err);
        res.status(500).json({
            message: 'Login error'
        });
    }
});

router.get('/getPendingOrders', async (req, res) => {

    try {
        const result = await db.query(
            'SELECT * FROM orders WHERE order_status = \'Pending\''
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("DETAILED ERROR:", err);
        res.status(500).json({
            message: 'Login error'
        });
    }
});

router.get('/importOrders', async (req, res) => {

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
            SELECT * FROM orders WHERE order_status='Delivered'
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

//UPDATING ORDER STATUS
router.put('/updateOrderToShipping/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const result = await db.query(
            'UPDATE orders SET order_status = $1 WHERE order_id = $2 RETURNING *',
            ['Shipping', orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
});

router.put('/updateOrderToReceived/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const result = await db.query(
            'UPDATE orders SET order_status = $1 WHERE order_id = $2 RETURNING *',
            ['Delivered', orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
});

router.put('/updateOrderToReturned/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const result = await db.query(
            'UPDATE orders SET order_status = $1 WHERE order_id = $2 RETURNING *',
            ['Returned', orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM accounts WHERE user_id = $1',
            [req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    const { "full-name": full_name, "contact-number": contact_number, "address": address } = req.body;
    try {
        await db.query(
            `UPDATE accounts SET "full-name" = $1, contact_number = $2, address = $3 WHERE user_id = $4`,
            [full_name, contact_number, address, req.user.userId]
        );
        res.json({ success: true, message: 'Profile updated successfully!' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Server error updating profile' });
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
app.get('/pending',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'pending.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'dashboard.html'));
});

app.get('/orders',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'orders.html'));
});
app.get('/profile',  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'frontend', 'html', 'profile.html'));
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