// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Get port number from environment variables
const PORT = process.env.PORT || 3000;

// Database connection details
const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

async function startServer() {
    try {
        await client.connect();
        console.log('Successfully connected to the PostgreSQL database!');
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

// === Middleware ===
// Middleware to verify a JWT and attach user data to the request
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token.' });
        }
        req.user = user;
        next();
    });
}

// === API Routes ===

// Root route (for testing)
app.get('/', (req, res) => {
    res.send('Hello from the E-commerce API!');
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const query = 'INSERT INTO users(email, password_hash) VALUES($1, $2) RETURNING id, email';
        const values = [email, passwordHash];
        const result = await client.query(query, values);
        res.status(201).json({
            message: 'User registered successfully!',
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Email already in use.' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    try {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await client.query(query, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: 'Login successful!',
            token: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// --- Public Product Routes ---
// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const query = 'SELECT * FROM products';
        const result = await client.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// === Protected Routes ===

// User profile endpoint
app.get('/api/profile', verifyToken, (req, res) => {
    res.status(200).json({
        message: 'You have access to a protected route!',
        user: req.user
    });
});

// Add a new product (Protected route - for admins)
app.post('/api/products', verifyToken, async (req, res) => {
    const { name, description, price, stock, image_url } = req.body;

    if (!name || !price || !stock) {
        return res.status(400).json({ message: 'Name, price, and stock are required.' });
    }

    try {
        const query = `
          INSERT INTO products(name, description, price, stock, image_url)
          VALUES($1, $2, $3, $4, $5)
          RETURNING id, name, description, price, stock, image_url
        `;
        const values = [name, description, price, stock, image_url];

        const result = await client.query(query, values);

        res.status(201).json({
            message: 'Product added successfully!',
            product: result.rows[0],
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Update a product by ID (Protected route - for admins)
app.put('/api/products/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, image_url } = req.body;

    try {
        const query = `
          UPDATE products
          SET 
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            price = COALESCE($3, price),
            stock = COALESCE($4, stock),
            image_url = COALESCE($5, image_url)
          WHERE id = $6
          RETURNING *
        `;
        const values = [name, description, price, stock, image_url, id];

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json({
            message: 'Product updated successfully!',
            product: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Delete a product by ID (Protected route - for admins)
app.delete('/api/products/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM products WHERE id = $1 RETURNING id';
        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json({
            message: 'Product deleted successfully!',
            id: result.rows[0].id,
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// --- Order Management Routes ---
// Add an item to the user's cart
app.post('/api/cart', verifyToken, async (req, res) => {
    const { product_id, quantity } = req.body;
    const user_id = req.user.userId;

    if (!product_id || !quantity) {
        return res.status(400).json({ message: 'Product ID and quantity are required.' });
    }

    try {
        const productQuery = 'SELECT price FROM products WHERE id = $1';
        const productResult = await client.query(productQuery, [product_id]);

        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        const productPrice = productResult.rows[0].price;

        const insertQuery = `
          INSERT INTO order_items(order_id, product_id, quantity, price)
          VALUES(NULL, $1, $2, $3)
          RETURNING *
        `;
        const insertValues = [product_id, quantity, productPrice];
        const result = await client.query(insertQuery, insertValues);

        res.status(201).json({
            message: 'Item added to cart successfully!',
            item: result.rows[0]
        });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Get all items in the user's cart
app.get('/api/cart', verifyToken, async (req, res) => {
    try {
        const cartItemsQuery = `
      SELECT
        oi.product_id,
        oi.quantity,
        oi.price,
        p.name AS product_name,
        p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IS NULL
    `;
    
    const result = await client.query(cartItemsQuery);

    res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Checkout endpoint
app.post('/api/checkout', verifyToken, async (req, res) => {
    const user_id = req.user.userId;
    let transactionClient;

    try {
        transactionClient = await new Client({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
        });

        await transactionClient.connect();
        await transactionClient.query('BEGIN'); // Start the database transaction

        // 1. Get all cart items for the user (where order_id is NULL)
        const cartItemsQuery = `
            SELECT oi.id, oi.product_id, oi.quantity, p.price, p.stock
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id IS NULL;
        `;
        const cartItemsResult = await transactionClient.query(cartItemsQuery);
        const cartItems = cartItemsResult.rows;

        if (cartItems.length === 0) {
            await transactionClient.query('ROLLBACK');
            return res.status(400).json({ message: 'Your cart is empty.' });
        }

        let totalAmount = 0;
        const stockUpdates = [];

        // 2. Verify stock and calculate total amount
        for (const item of cartItems) {
            if (item.quantity > item.stock) {
                await transactionClient.query('ROLLBACK');
                return res.status(400).json({ message: `Insufficient stock for product ID ${item.product_id}.` });
            }
            totalAmount += parseFloat(item.price) * item.quantity;

            stockUpdates.push(
                transactionClient.query('UPDATE products SET stock = stock - $1 WHERE id = $2;', [item.quantity, item.product_id])
            );
        }

        // 3. Create a new order
        const createOrderQuery = 'INSERT INTO orders(user_id, total_amount, status) VALUES($1, $2, $3) RETURNING id;';
        const createOrderValues = [user_id, totalAmount, 'completed'];
        const orderResult = await transactionClient.query(createOrderQuery, createOrderValues);
        const orderId = orderResult.rows[0].id;

        // 4. Update order_id for each cart item
        const updateCartItemsQuery = `
            UPDATE order_items
            SET order_id = $1
            WHERE order_id IS NULL;
        `;
        await transactionClient.query(updateCartItemsQuery, [orderId]);

        // 5. Update the product stock
        await Promise.all(stockUpdates);

        await transactionClient.query('COMMIT');

        res.status(200).json({
            message: 'Checkout successful!',
            order_id: orderId,
            total_amount: totalAmount,
        });

    } catch (error) {
        if (transactionClient) {
            await transactionClient.query('ROLLBACK');
        }
        console.error('Checkout error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (transactionClient) {
            await transactionClient.end();
        }
    }
});

// Get a list of all orders for the authenticated user
app.get('/api/orders', verifyToken, async (req, res) => {
    const user_id = req.user.userId;
    try {
        const query = `
            SELECT 
                o.id AS order_id, 
                o.total_amount, 
                o.status, 
                o.created_at,
                json_agg(
                    json_build_object(
                        'product_id', p.id,
                        'name', p.name,
                        'quantity', oi.quantity,
                        'price', oi.price
                    )
                ) AS items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC;
        `;
        const result = await client.query(query, [user_id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Start the server
startServer();