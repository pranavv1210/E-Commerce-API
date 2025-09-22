# 🌐 E-Commerce Backend API

An in-depth backend API for an e-commerce platform, built as a comprehensive learning project by Pranav. This API serves as the "brain" of an online store, managing all business logic and data for users, products, and orders. The project demonstrates a foundational understanding of secure API design and database management, making it an excellent resource for anyone looking to learn backend development.

## ✨ Key Features in Detail

  * **User Management:** Handles the full user lifecycle, from secure registration with password hashing to a token-based login system for seamless access.
  * **Authentication & Security:** Implements JSON Web Tokens (JWT) to secure protected routes, ensuring that sensitive data and administrative actions can only be performed by authenticated users.
  * **Product Management:** Provides full **CRUD (Create, Read, Update, Delete)** functionality, allowing for the comprehensive management of all product data in the store.
  * **Shopping Cart:** A robust system that allows users to add items to a temporary cart before a final purchase.
  * **Checkout Process:** A complex, multi-step endpoint that uses a database transaction to ensure data integrity. It verifies product stock, creates a new order, and updates product inventory in a single, atomic operation.
  * **Order History:** Allows an authenticated user to view their complete list of past orders, providing a detailed view of their purchases.

## ⚙️ The Technology Stack

This project was built using a powerful and modern set of backend technologies.

  * **Node.js:** A JavaScript runtime environment that allows for building fast and scalable server-side applications.
  * **Express.js:** A minimalist and flexible Node.js web framework that provides a robust set of features for building RESTful APIs.
  * **PostgreSQL:** A powerful, open-source relational database. It was chosen for its data integrity features and ability to enforce clear relationships between tables.
  * **`bcrypt`:** A library used to securely hash and salt user passwords, ensuring they are never stored in plain text.
  * **`jsonwebtoken`:** A library for creating and verifying JSON Web Tokens (JWTs), which are used for stateless authentication.
  * **`dotenv`:** A module that loads environment variables from a `.env` file, keeping sensitive data out of the codebase.

## 🛠️ Prerequisites

Before you can run this project, you need to have the following tools installed and configured on your machine.

  * **Node.js & npm:** These are essential for running the JavaScript server.
  * **PostgreSQL:** The database server where all the application's data is stored.
  * **Git:** A version control system used to manage the project's code.
  * **A REST Client:** A tool like **Thunder Client** (recommended) or Postman is required to send API requests and test the endpoints.

## 🏁 Getting Started

Follow these instructions in order to get the project up and running on your local machine.

### Step 1: Clone the Repository

Clone the project from your GitHub repository to your local machine using the command line.

```bash
git clone https://github.com/pranavv1210/E-Commerce-API.git
cd E-Commerce-API
```

### Step 2: Install Dependencies

Navigate into the project directory and install all the required Node.js packages.

```bash
npm install
```

### Step 3: Database Setup

This is the most critical step. You'll set up your PostgreSQL database using the provided scripts.

1.  **Create Database:** Use `pgAdmin` or the `psql` command line tool to create a new, empty database named **`ecommerce_api_db`**.

2.  **Run Schema Script:** Run the following SQL script to create all the necessary tables. You can paste this into the `Query Tool` in `pgAdmin`.

    ```sql
    -- This script creates the tables for the E-Commerce API database.

    -- Create the 'users' table
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create the 'products' table
    CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER NOT NULL,
        image_url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create the 'orders' table
    CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        total_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create the 'order_items' table to manage the many-to-many relationship
    CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL
    );
    ```

3.  **Run Seed Data Script:** Run the following SQL script to populate your `products` table with initial data.

    ```sql
    -- This script adds sample data to the products table.

    INSERT INTO products (name, description, price, stock, image_url)
    VALUES (
      'Wireless Mouse', 
      'A high-quality wireless mouse with ergonomic design.', 
      25.50, 
      100, 
      'https://example.com/images/mouse.jpg'
    );

    INSERT INTO products (name, description, price, stock, image_url)
    VALUES (
      'Mechanical Keyboard', 
      'A durable mechanical keyboard with RGB backlighting.', 
      89.99, 
      50, 
      'https://example.com/images/keyboard.jpg'
    );
    ```

4.  **Configure Environment Variables:** Create a file named `.env` in the root of your project and add the following contents. Make sure to replace the placeholder values with your actual database password and a unique secret key.

    ```
    PORT=3000

    DB_HOST=localhost
    DB_USER=postgres
    DB_PASSWORD=YOUR_POSTGRES_PASSWORD
    DB_NAME=ecommerce_api_db
    DB_PORT=5432

    JWT_SECRET=a_very_secure_and_long_secret_key
    ```

### Step 4: Run the Server

Start the Node.js server.

```bash
node server.js
```

The server will be running on `http://localhost:3000`.

## ⚙️ API Endpoints

This is the API documentation for all available endpoints. The base URL for all requests is `http://localhost:3000`.

| Method | Endpoint | Description | Auth | Sample Request | Sample Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/register` | Creates a new user account with a hashed password. | Public | `{ "email": "user@example.com", "password": "password123" }` | `{ "message": "User registered successfully!" }` |
| `POST` | `/api/login` | Authenticates a user and returns a JWT for future requests. | Public | `{ "email": "user@example.com", "password": "password123" }` | `{ "message": "Login successful!", "token": "eyJhbGciOiJIUzI1Ni..." }` |
| `GET` | `/api/profile` | Retrieves the authenticated user's details from their JWT. | **Protected** | N/A | `{ "message": "You have access to a protected route!", "user": { "userId": 1, "email": "user@example.com" } }` |
| `GET` | `/api/products` | Retrieves a list of all products in the store. | Public | N/A | `[ { "id": 1, "name": "Wireless Mouse", ... } ]` |
| `POST` | `/api/products` | Adds a new product to the catalog. | **Protected** | `{ "name": "New Product", "price": 10.00, "stock": 50 }` | `{ "message": "Product added successfully!" }` |
| `PUT` | `/api/products/:id` | Updates an existing product by its ID. | **Protected** | `{ "price": 9.99 }` | `{ "message": "Product updated successfully!" }` |
| `DELETE` | `/api/products/:id` | Deletes a product by its ID. | **Protected** | N/A | `{ "message": "Product deleted successfully!" }` |
| `POST` | `/api/cart` | Adds a product and quantity to the user's cart. | **Protected** | `{ "product_id": 1, "quantity": 1 }` | `{ "message": "Item added to cart successfully!" }` |
| `GET` | `/api/cart` | Retrieves the contents of the user's shopping cart. | **Protected** | N/A | `[ { "product_id": 1, "name": "Wireless Mouse", "quantity": 1, ... } ]` |
| `POST` | `/api/checkout` | Finalizes the order, updates product stock, and creates a new order record. | **Protected** | N/A | `{ "message": "Checkout successful!", "order_id": 1, "total_amount": 10.00 }` |
| `GET` | `/api/orders` | Retrieves a list of all past orders for the authenticated user. | **Protected** | N/A | `[ { "order_id": 1, "total_amount": 10.00, "status": "completed", "items": [ ... ] } ]` |

## 🤝 Contribution

This is an open-source project. If you'd like to contribute, feel free to open an issue or submit a pull request.

-----

© 2025 Pranav. All Rights Reserved.