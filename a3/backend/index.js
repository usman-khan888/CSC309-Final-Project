#!/usr/bin/env node
'use strict';

// Declare resetAttempts as a global variable for rate limiting
const resetAttempts = new Map();

//--------------------------------------------------------------- SECRET KEY
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXRvcmlkIjoiY2xpdmUxMjMiLCJyb2xlIjoic3VwZXJ1c2VyIiwiaWF0IjoxNzQyMzI4MDcwLCJleHAiOjE3NDIzMzE2NzB9.Z5JtGXFz6oNn4Qq5SO-gVHzACYjtBnMflY_AO7FxH7c';
//----------------------------------------------------------------




// Functionality: Rate limiting for password reset requests
const rateLimitReset = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowSize = 60 * 1000; // 1 minute
    const maxAttempts = 5;

    if (!resetAttempts.has(ip)) {
        resetAttempts.set(ip, []);
    }

    const attempts = resetAttempts.get(ip);
    const recentAttempts = attempts.filter(time => now - time < windowSize);

    if (recentAttempts.length >= maxAttempts) {
        return res.status(429).json({ error: "Too many requests. Try again later." });
    }

    attempts.push(now);
    resetAttempts.set(ip, attempts);
    next();
};


const roleHierarchy = {
    'regular': 0,
    'cashier': 1,
    'manager': 2,
    'superuser': 3,
};
// -----------------------------------------------------------------------
const port = (() => {
    const args = process.argv;

    if (args.length !== 3) {
        console.error("usage: node index.js port");
        process.exit(1);
    }

    const num = parseInt(args[2], 10);
    if (isNaN(num)) {
        console.error("error: argument must be an integer.");
        process.exit(1);
    }

    return num;
})();

const express = require("express");
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const cors = require("cors"); // Import CORS middleware
app.use(express.json());

// Configure CORS to allow only your frontend origin
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"; 
app.use(
  cors({
    origin: FRONTEND_URL, // Restrict requests to this origin
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"], // Adjust based on your needs
    credentials: true, // Enable if using cookies/sessions
  })
);


//----------------------------------------------------------------------------------


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars/'); // Save uploaded files to the 'uploads/avatars' directory
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Get file extension
        const filename = `${req.user.utorid}${ext}`; // Use the user's utorid as the filename
        cb(null, filename);
    },
});

const upload = multer({ storage });

// Add this before the server starts listening
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the API! Use /api to access endpoints." });
});

const calculateEarnedPoints = (spent) => {
    const rate = 1 / 0.25; // 1 point per 25 cents
    return Math.round(spent * rate);
  };

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
    //console.log("Request headers:", req.headers); 
    
    //console.log("🔐 [0] Middleware triggered for:", req.method, req.path);
    // Extract the token from the Authorization header
    // console.log("🔐 Incoming request to", req.path);
    // console.log("🪪 Headers:", req.headers);

    const authHeader = req.header('authorization');
    //console.log("🔐 [1] Auth header:", authHeader); 
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //console.log("❌ [2] Missing/malformed auth header");
        // console.log("❌ No valid Authorization header");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(' ')[1]; // Extract the token part after "Bearer "
    //console.log("🔐 [3] Extracted token:", token);
    if (!token) {
        // console.log("❌ Token missing after 'Bearer '");
        return res.status(401).json({ error: "Unauthorized: Invalid token format" });
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        // console.log("token: ", token, "JWT_SECRET: ", JWT_SECRET)
        if (err) {
            //console.log("❌ [4] JWT verification failed:", err.message);
            //console.log("❌ JWT verification error:", err);
            return res.status(403).json({ error: "Forbidden: Invalid or expired token" });
        }
        req.user = user; // Attach the decoded user payload to the request object
        //console.log("✅ [5] Decoded token:", user);
        // console.log("✅ Token verified. Payload:", user);
        next(); // Proceed to the next middleware or route handler
    });
};

// Middleware to check user role
const checkRole = (role) => (req, res, next) => {
    // Default the user's role to 'regular' if it is missing or invalid
    const userRole = req.user.role ?? 'regular';

    // Check if the user's role level is sufficient
    if (roleHierarchy[userRole] < roleHierarchy[role]) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // Proceed to the next middleware/route handler
    next();
};

// User Registration (Cashier can create an account for a User)
app.post('/users', authenticateJWT,  checkRole('cashier'), async (req, res) => { // removed authentication for now
    const { utorid, name, email } = req.body;
    const userRole = req.user.role;
    //userRole = 'manager';

    // Check if the user has permission (cashier or higher)
    if (roleHierarchy[userRole] < roleHierarchy['cashier']) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // Validate required fields
    if (!utorid || !name || !email) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Validate name length (1-50 characters)
    if (name.length < 1 || name.length > 50) {
        return res.status(400).json({ error: "Name must be between 1 and 50 characters" });
    }

    // Validate email format (UofT email)
    if (!/^[^@]+@mail\.utoronto\.ca$/.test(email)) {
        return res.status(400).json({ error: "Email must be a valid University of Toronto email" });
    }

    // Validate UTORid format (8 alphanumeric characters)
    if (!/^[a-zA-Z0-9]{8}$/.test(utorid)) {
        return res.status(400).json({ error: "UTORid must be exactly 8 alphanumeric characters" });
    }

    try {
        // Check if UTORid is already in use
        const existingUtorid = await prisma.user.findUnique({
            where: { utorid },
        });
        if (existingUtorid) {
            return res.status(409).json({ error: "UTORid already exists" });
        }

        // Check if email is already in use
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Create the user
        const user = await prisma.user.create({
            data: {
                utorid,
                name,
                email,
                role: 'regular', // Default role for new users
                verified: false, // Default verification status
            },
        });

        // const resetToken = uuidv4(); // Use a library like 'uuid' to generate a unique token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7*24 hours from now
        const resetToken = jwt.sign(
            { 
                id: user.id, // Payload
                tokenVersion: user.tokenVersion, // Include token version
            },
            JWT_SECRET, // Secret key
            { expiresIn: '168h' } // Expiration time
        );
        

        // Respond with the user details and reset token
        res.status(201).json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            verified: user.verified,
            expiresAt: expiresAt.toISOString(),
            resetToken,
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') { // Prisma unique constraint violation
            return res.status(409).json({ error: "Conflict: UTORid or email already exists" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});





// Retrieve a list of users
app.get('/users', authenticateJWT, async (req, res) => {
    const { name, role, verified, activated, page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;
    //console.log("----------------------------------------- req query is: ", req.query)


    // Check if the user has permission (manager or higher)
    if(!page || !limit || parseInt(page) < 1 || parseInt(limit) > 10){
        return res.status(400).json({error: "Page or limit out of bounds"})
    }


    if (roleHierarchy[userRole] < roleHierarchy['manager']) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
        // Validate and sanitize page and limit
        const pageNumber = Math.max(1, parseInt(page)); // Ensure page is at least 1
        const limitNumber = Math.max(1, parseInt(limit)); // Ensure limit is at least 1

        // Build the filter object
        const filter = {};

        // Filter by name or utorid
        if (name) {
            filter.OR = [
                { name: { contains: name } },
                { utorid: { contains: name } },
            ];
        }

        // Filter by role
        if (role) {
            filter.role = role;
        }

        // Filter by verified status
        if (verified !== undefined) {
            filter.verified = verified === 'true';
        }

        // Filter by whether the user has ever logged in
        if (activated !== undefined) {
            if (activated === 'true') {
                filter.lastLogin = { not: null }; // User has logged in at least once
            } else {
                filter.lastLogin = null; // User has never logged in
            }
        }

        // Fetch the total count of users matching the filters
        const count = await prisma.user.count({ where: filter });

        // Fetch the paginated list of users
        const users = await prisma.user.findMany({
            where: filter,
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                password: true,
                birthday: true,
                role: true,
                points: true,
                createdAt: true,
                lastLogin: true,
                verified: true,
                avatarUrl: true,
            },
            skip: (pageNumber - 1) * limitNumber, // Pagination offset (now guaranteed non-negative)
            take: limitNumber, // Number of results per page
        });

        const users_debug = await prisma.user.findMany({
            where: filter,
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                birthday: true,
                role: true,
                points: true,
                createdAt: true,
                lastLogin: true,
                verified: true,
                avatarUrl: true,
            },
            skip: (pageNumber - 1) * limitNumber, // Pagination offset (now guaranteed non-negative)
            take: 30, // Number of results per page
        });
        

        //console.log("-------------------------------------------- count: ", count, "result: ", users_debug)

        // Return the response with count and results
        res.status(200).json({
            count,
            results: users,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Update the current logged-in user's information
app.patch('/users/me', authenticateJWT, upload.single('avatar'), async (req, res) => {
    const { name, email, birthday } = req.body;
    const avatarFile = req.file; // Uploaded avatar file
    const userId = req.user.id; // ID of the logged-in user

    try {
        // Prepare the update data
        const updateData = {};

        // Handle name
        if (name !== undefined) {
            if (name === null) {
                updateData.name = null; // Allow null
            } else if (name.length < 1 || name.length > 50) {
                return res.status(400).json({ error: "Name must be between 1 and 50 characters" });
            } else {
                updateData.name = name;
            }
        }

        // Handle email
        if (email !== undefined) {
            if (email === null) {
                updateData.email = null; // Allow null
            } else if (!/^[^@]+@mail\.utoronto\.ca$/.test(email)) {
                return res.status(400).json({ error: "Email must be a valid University of Toronto email" });
            } else {
                updateData.email = email;
            }
        }

        // Handle birthday
        if (birthday !== undefined) {
            if (birthday === null) {
                updateData.birthday = null; // Allow null
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
                return res.status(400).json({ error: "Birthday must be in the format YYYY-MM-DD" });
            } else {
                updateData.birthday = new Date(birthday);
            }
        }

        // Handle avatar
        if (avatarFile) {
            updateData.avatarUrl = `/uploads/avatars/${avatarFile.filename}`; // Save the avatar URL
        }

        // Update the user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                birthday: true,
                role: true,
                points: true,
                createdAt: true,
                lastLogin: true,
                verified: true,
                avatarUrl: true,
            },
        });

        // Return the updated user details
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') { // Prisma unique constraint violation (e.g., duplicate email)
            return res.status(400).json({ error: "Bad Request" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});


// Retrieve the current logged-in user's information
app.get('/users/me', authenticateJWT, async (req, res) => {
    console.log("✅ Inside /users/me route handler");
    console.log("User from token:", req.user);
    const userId = req.user.id; // ID of the logged-in user
    if (!userId) {
        return res.status(400).json({ error: "User ID missing in token" });
    }
    console.log("Authenticated user ID:", req.user.id);

    try {
        // Fetch the current user's information
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                birthday: true,
                role: true,
                points: true,
                createdAt: true,
                lastLogin: true,
                verified: true,
                avatarUrl: true,
                promotions: {
                    where: {
                        type: 'one-time', // Only one-time promotions
                        transactions: { none: { userId: userId } }, // Promotions not used by the user
                    },
                    select: {
                        id: true,
                        name: true,
                        minSpending: true,
                        rate: true,
                        points: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: "Not Found" });
        }

        // Return the user's information
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Retrieve a specific user
app.get('/users/:userId', authenticateJWT, checkRole('cashier'), async (req, res) => {
    const { userId } = req.params;
    const userRole = req.user.role;

    // Check if the user has permission (cashier or higher)
    if (isNaN(userId) || parseInt(userId) <= 0) {
        return res.status(400).json({ error: "Bad Request" });
    }

    if (roleHierarchy[userRole] < roleHierarchy['cashier']) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // Validate userId (must be a positive integer)

    try {
        // Define the base query for fetching user data
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: {
                id: true,
                utorid: true,
                name: true,
                points: true,
                verified: true,
                promotions: {
                    where: {
                        type: 'one-time', // Only one-time promotions
                        transactions: { none: { userId: parseInt(userId) } }, // Promotions not used by the user
                    },
                    select: {
                        id: true,
                        name: true,
                        minSpending: true,
                        rate: true,
                        points: true,
                    },
                },
                // Additional fields for manager or higher
                ...(roleHierarchy[userRole] >= roleHierarchy['manager'] ? {
                    email: true,
                    birthday: true,
                    role: true,
                    createdAt: true,
                    lastLogin: true,
                    avatarUrl: true,
                } : {}),
            },
        });

        // Check if the user exists
        if (!user) {
            return res.status(404).json({ error: "Not Found" });
        }

        // Return the appropriate response based on the user's role
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});




// Update a specific user's various statuses and some information
app.patch('/users/:userId', authenticateJWT, async (req, res) => {
    const { userId } = req.params;
    const { email, verified, suspicious, role } = req.body;
    const userRole = req.user.role;

    if(!email && !verified && !suspicious && !role){
        return res.status(400).json({error: "empty payload"})
    }
    
    if (email && !/^[^@]+@mail\.utoronto\.ca$/.test(email)) {
        return res.status(400).json({ error: "Email must be a valid University of Toronto email" });
    }

    // Check if the user has permission (manager or higher)
    if (roleHierarchy[userRole] < roleHierarchy['manager']) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
        // Fetch the current user to check their existing role
        const currentUser = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { role: true },
        });

        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Validate role updates based on the requesting user's role
        if (role) {
            if (userRole === 'manager') {
                // Managers can only promote users to "cashier" or "regular"
                if (role !== 'cashier' && role !== 'regular') {
                    return res.status(403).json({ error: "Forbidden: Managers can only set roles to 'cashier' or 'regular'" });
                }
            } else if (userRole === 'superuser') {
                // Superusers can set any role
                if (!['regular', 'cashier', 'manager', 'superuser'].includes(role)) {
                    return res.status(400).json({ error: "Invalid role" });
                }
            }
        }

        // Prepare the update data
        const updateData = {};
        if (email !== undefined) updateData.email = email;
        if (verified !== undefined) updateData.verified = verified;
        if (suspicious !== undefined) updateData.suspicious = suspicious;
        if (role !== undefined) {
            updateData.role = role;
            // When promoting to cashier, set suspicious to false
            if (role === 'cashier') {
                updateData.suspicious = false;
            }
        }

        // Update the user
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: updateData,
            select: {
                id: true,
                utorid: true,
                name: true,
                email: email !== undefined,
                verified: verified !== undefined,
                suspicious: suspicious !== undefined,
                role: role !== undefined,
            },
        });

        // Return only the updated fields
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') { // Prisma unique constraint violation (e.g., duplicate email)
            return res.status(400).json({ error: "Bad Request" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});







// Update the current logged-in user's password
app.patch('/users/me/password', authenticateJWT, async (req, res) => {
    const userId = req.user.id; // ID of the logged-in user
    const { old: oldPassword, new: newPassword } = req.body;

    // Validate required fields
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: "Bad Request" });
    }

    // Validate new password format
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ error: "Bad Request" });
    }

    try {
        // Fetch the current user's password hash
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });

        if (!user) {
            return res.status(404).json({ error: "Not Found" });
        }

        // Verify the old password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        // Return success response
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Authenticate a user and generate a JWT token
app.post('/auth/tokens', async (req, res) => {
    const { utorid, password } = req.body;

    // Validate required fields
    if (!utorid || !password) {
        console.log("Both 'utorid' and 'password' are required")
        return res.status(400).json({ error: "Both 'utorid' and 'password' are required" });
    }

    try {
        // Fetch the user by utorid
        const user = await prisma.user.findUnique({
            where: { utorid },
        });

        // Check if the user exists
        if (!user) {
            console.log("Invalid credentials")
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update the user's last login time to the current time
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        // Verify the password
        if (!user.password){return res.status(401).json({error: "no password set yet"})}
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log("Invalid password")
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate a JWT token
        const token = jwt.sign(
            { id: user.id, utorid: user.utorid, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Calculate the expiration time
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Respond with the token and expiration time
        res.status(200).json({
            token,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Request a password reset email.
app.post('/auth/resets', rateLimitReset, async (req, res) => {

   
    const { utorid } = req.body;

    // Validate required field
    if (!utorid) {
        console.log("utorid is required")
        return res.status(400).json({ error: "utorid is required" });
    }

    // Check if the user exists
    const user = await prisma.user.findUnique({ where: { utorid } });
    if (!user) {
        console.log("User not found")
        return res.status(404).json({ error: "User not found" });
    }

    // Generate a reset token
    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { tokenVersion: user.tokenVersion + 1 },
    });


    const resetToken = jwt.sign({ id: user.id, tokenVersion: updatedUser.tokenVersion }, JWT_SECRET, { expiresIn: '1h' });

    
    

    // Respond with the reset token and expiration time
    res.status(202).json({
        resetToken,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
    });
});




// Reset the password of a user given a reset token.
app.post('/auth/resets/:resetToken', async (req, res) => {
    const { resetToken } = req.params;
    const { utorid, password } = req.body;

    // Validate required fields
    if (!utorid || !password) {
        return res.status(400).json({ error: "Both 'utorid' and 'password' are required" });
    }

    // Validate password format
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "Password must be 8-20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character" });
    }

    try {
        // Verify the reset token
        const decoded = jwt.verify(resetToken, JWT_SECRET);


        // Check if the user exists
        const user = await prisma.user.findUnique({ where: { utorid } });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }


        // Check if the token version matches
        if (decoded.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({ error: "Invalid reset token" });
        }
        //console.log("------------------------------reset token date: ", decoded.expiresAt.Date, " date now: ", Date.now())
        // if (resetToken && Date.now() > decoded.expiresAt){return res.status(410).json({error: "Reset Token Expired"})}
        // Ensure the token belongs to the user
        if (decoded.id !== user.id) {
            return res.status(401).json({ error: "Invalid reset token" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user's password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Respond with success
        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            // Token has expired
            return res.status(410).json({ error: "Reset token expired" });
        } else if (error.name === 'JsonWebTokenError') {
            // Token is invalid
            return res.status(404).json({ error: "Invalid reset token" });
        } else {
            // Other errors
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
});


// Create a new purchase transaction.
app.post(
    '/transactions',
    authenticateJWT,
    async (req, res) => {
      const { utorid, type, spent, amount, relatedId, promotionIds, remark } = req.body;
      const createdBy = req.user.utorid; // The user creating the transaction
  
      // Validate common fields
      if (!utorid || !type) {
        return res.status(400).json({ error: "utorid and type are required" });
      }
  
      try {
        // Find the user
        const user = await prisma.user.findUnique({ where: { utorid } });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
  
        // Handle purchase transaction
        if (type === 'purchase') {
          // Check if the user has cashier or higher clearance
          if (roleHierarchy[req.user.role] < roleHierarchy['cashier']) {
            return res.status(403).json({ error: "Forbidden: Insufficient role" });
          }
  
          // Validate purchase-specific fields
          if (typeof spent !== 'number' || spent <= 0) {
            return res.status(400).json({ error: "Spent must be a positive number" });
          }
  
          // Validate promotions (if any)
          let promotions = [];
          if (promotionIds && promotionIds.length > 0) {
            promotions = await prisma.promotion.findMany({
              where: { id: { in: promotionIds } },
            });
            if (promotions.length !== promotionIds.length) {
              return res.status(400).json({ error: "Invalid or expired promotion IDs" });
            }
          }
  
          // Calculate earned points
          let earned = calculateEarnedPoints(spent);
  
          // Apply promotions (if any)
          for (const promotion of promotions) {
            if (promotion.type === 'automatic' && promotion.rate) {
              earned += Math.round(spent * promotion.rate);
            } else if (promotion.type === 'one-time' && promotion.points) {
              earned += promotion.points;
            }
          }
  
          // Create the purchase transaction
          const transaction = await prisma.transaction.create({
            data: {
              type,
              spent,
              earned,
              remark,
              createdBy,
              userId: user.id,
              promotionId: promotionIds[0] || 0,
              suspicious: req.user.suspicious || false, // Mark as suspicious if the cashier is flagged
            },
          });
  
          // Update user's points balance (if not suspicious)
          if (!req.user.suspicious) {
            await prisma.user.update({
              where: { id: user.id },
              data: { points: user.points + earned },
            });
          }
  
          // Return the created transaction
          return res.status(201).json({
            id: transaction.id,
            utorid,
            type,
            spent,
            earned,
            remark,
            promotionIds: promotionIds || [],
            createdBy,
          });
        }
  
        // Handle adjustment transaction
        else if (type === 'adjustment') {
          // Check if the user has manager or higher clearance
          if (roleHierarchy[req.user.role] < roleHierarchy['manager']) {
            return res.status(403).json({ error: "Forbidden: Insufficient role" });
          }
  
          // Validate adjustment-specific fields
          if (typeof amount !== 'number') {
            return res.status(400).json({ error: "Amount must be a number" });
          }
          if (typeof relatedId !== 'number') {
            return res.status(400).json({ error: "Related ID must be a number" });
          }
  
          // Find the related transaction
          const relatedTransaction = await prisma.transaction.findUnique({
            where: { id: relatedId },
          });
          if (!relatedTransaction) {
            return res.status(400).json({ error: "Related transaction not found" });
          }
  
          // Validate promotions (if any)
          let promotions = [];
          if (promotionIds && promotionIds.length > 0) {
            promotions = await prisma.promotion.findMany({
              where: { id: { in: promotionIds } },
            });
            if (promotions.length !== promotionIds.length) {
              return res.status(400).json({ error: "Invalid or expired promotion IDs" });
            }
          }
  
          // Create the adjustment transaction
          const transaction = await prisma.transaction.create({
            data: {
              type,
              amount,
              relatedId,
              remark,
              createdBy,
              userId: user.id,
              promotionId: promotionIds[0] || 0,
            },
          });
  
          // Update user's points balance
          await prisma.user.update({
            where: { id: user.id },
            data: { points: user.points + amount },
          });
  
          // Return the created transaction
          return res.status(201).json({
            id: transaction.id,
            utorid,
            type,
            amount,
            relatedId,
            remark,
            promotionIds: promotionIds || [],
            createdBy,
          });
        }
  
        // Invalid transaction type
        else {
          return res.status(400).json({ error: "Invalid transaction type" });
        }
      } catch (error) {
        console.error("Error creating transaction:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );


// Retrieve a list of transactions with filtering and pagination
app.get('/transactions', authenticateJWT, checkRole('manager'), async (req, res) => {
    const {
        name,
        createdBy,
        suspicious,
        promotionId,
        type,
        relatedId,
        amount,
        operator,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Validate inputs
    try {
        // Validate pagination parameters
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum)) throw new Error("Page must be a number");
        if (isNaN(limitNum)) throw new Error("Limit must be a number");
        if (pageNum < 1) throw new Error("Page must be at least 1");
        if (limitNum < 1 || limitNum > 100) throw new Error("Limit must be between 1 and 100");

        // Validate relatedId and type
        if (relatedId && !type) {
            throw new Error("relatedId must be used with type");
        }

        // Validate amount and operator
        if (amount && !operator) {
            throw new Error("amount must be used with operator");
        }
        if (operator && !['gte', 'lte', 'gt', 'lt', 'equals'].includes(operator)) {
            throw new Error("operator must be one of: gte, lte, gt, lt, equals");
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    try {
        // Build the filter object
        const filter = {};

        // Filter by name (utorid or user name)
        if (name) {
            filter.OR = [
                { user: { utorid: { contains: name, mode: 'insensitive' } } },
                { user: { name: { contains: name, mode: 'insensitive' } } },
            ];
        }

        // Filter by createdBy
        if (createdBy) {
            filter.createdBy = { contains: createdBy, mode: 'insensitive' };
        }

        // Filter by suspicious
        if (suspicious !== undefined) {
            filter.suspicious = suspicious === 'true';
        }

        // Filter by promotionId
        if (promotionId) {
            filter.promotionId = parseInt(promotionId);
        }

        // Filter by type
        if (type) {
            filter.type = type;
        }

        // Filter by relatedId
        if (relatedId) {
            filter.relatedId = parseInt(relatedId);
        }

        // Filter by amount and operator
        if (amount && operator) {
            filter.amount = { [operator]: parseInt(amount) };
        }

        // Fetch both count and transactions in parallel for better performance
        const [count, transactions] = await Promise.all([
            prisma.transaction.count({ where: filter }),
            prisma.transaction.findMany({
                where: filter,
                include: {
                    user: {
                        select: {
                            utorid: true,
                            name: true,
                            email: true,
                        },
                    },
                    promotion: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    event: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: parseInt(limit),
            }),
        ]);

        // Format the response
        const results = transactions.map(transaction => ({
            id: transaction.id,
            user: {
                utorid: transaction.user.utorid,
                name: transaction.user.name,
                email: transaction.user.email,
            },
            amount: transaction.amount,
            type: transaction.type,
            spent: transaction.spent,
            promotion: transaction.promotion,
            event: transaction.event,
            suspicious: transaction.suspicious,
            remark: transaction.remark,
            createdBy: transaction.createdBy,
            relatedId: transaction.relatedId,
            createdAt: transaction.createdAt,
        }));

        // Respond with pagination metadata and results
        res.status(200).json({
            metadata: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
            },
            results,
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ 
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// Retrieve a single transaction 
app.get('/transactions/:transactionId', authenticateJWT, checkRole('manager'), async (req, res) => {
    const { transactionId } = req.params;

    try {
        // Fetch the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transactionId) },
            include: {
                user: {
                    select: {
                        utorid: true,
                    },
                },
                promotion: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        // Check if the transaction exists
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        // Format the response
        const response = {
            id: transaction.id,
            utorid: transaction.user.utorid,
            type: transaction.type,
            spent: transaction.spent,
            amount: transaction.amount,
            promotionIds: transaction.promotions.map(promo => promo.id),
            suspicious: transaction.suspicious,
            remark: transaction.remark,
            createdBy: transaction.createdBy,
        };

        // Respond with the transaction details
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Set or unset a transaction as being suspicious
app.patch('/transactions/:transactionId/suspicious', authenticateJWT, checkRole('manager'), async (req, res) => {
    const { transactionId } = req.params;
    const { suspicious } = req.body;

    // Validate required field
    if (suspicious === undefined) {
        return res.status(400).json({ error: "suspicious field is required" });
    }

    try {
        // Fetch the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transactionId) },
            include: {
                user: {
                    select: {
                        id: true,
                        utorid: true,
                        points: true,
                    },
                },
                promotion: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        // Check if the transaction exists
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        // Determine the points adjustment
        let pointsAdjustment = 0;
        if (suspicious && !transaction.suspicious) {
            // Marking as suspicious: deduct the amount from the user's points
            pointsAdjustment = -transaction.amount;
        } else if (!suspicious && transaction.suspicious) {
            // Marking as not suspicious: credit the amount to the user's points
            pointsAdjustment = transaction.amount;
        }

        // Update the transaction's suspicious flag
        const updatedTransaction = await prisma.transaction.update({
            where: { id: parseInt(transactionId) },
            data: { suspicious },
            include: {
                user: {
                    select: {
                        utorid: true,
                    },
                },
                promotions: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        // Update the user's points balance
        if (pointsAdjustment !== 0) {
            await prisma.user.update({
                where: { id: transaction.user.id },
                data: { points: transaction.user.points + pointsAdjustment },
            });
        }

        // Format the response
        const response = {
            id: updatedTransaction.id,
            utorid: updatedTransaction.user.utorid,
            type: updatedTransaction.type,
            spent: updatedTransaction.spent,
            amount: updatedTransaction.amount,
            promotionIds: updatedTransaction.promotions.map(promo => promo.id),
            suspicious: updatedTransaction.suspicious,
            remark: updatedTransaction.remark,
            createdBy: updatedTransaction.createdBy,
        };

        // Respond with the updated transaction details
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Create a new transfer transaction between the current logged-in user (sender) and the user specified by userId (the recipient)
app.post('/users/:userId/transactions', authenticateJWT, async (req, res) => {
    const { userId: recipientId } = req.params;
    const { type, amount, remark } = req.body;
    const senderId = req.user.id; // ID of the logged-in user (sender)
    const senderUtorid = req.user.utorid; // utorid of the logged-in user (sender)

    // Validate required fields
    if (!type || amount === undefined) {
        return res.status(400).json({ error: "type and amount are required" });
    }

    // Validate type
    if (type !== 'transfer') {
        return res.status(400).json({ error: "type must be 'transfer'" });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        return res.status(400).json({ error: "amount must be a positive integer" });
    }

    try {
        // Fetch the sender (logged-in user)
        const sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: {
                id: true,
                utorid: true,
                points: true,
                verified: true,
            },
        });

        // Check if the sender is verified
        if (!sender.verified) {
            return res.status(403).json({ error: "Sender is not verified" });
        }

        // Check if the sender has enough points
        if (sender.points < amount) {
            return res.status(400).json({ error: "Sender does not have enough points" });
        }

        // Fetch the recipient
        const recipient = await prisma.user.findUnique({
            where: { id: parseInt(recipientId) },
            select: {
                id: true,
                utorid: true,
                points: true,
            },
        });

        // Check if the recipient exists
        if (!recipient) {
            return res.status(404).json({ error: "Recipient not found" });
        }

        // Create the sender's transaction (deduct points)
        const senderTransaction = await prisma.transaction.create({
            data: {
                type: 'transfer',
                amount: -amount, // Deduct points from sender
                remark: remark || '',
                createdBy: senderUtorid,
                userId: sender.id,
                relatedId: recipient.id, // Related to the recipient
            },
        });

        // Create the recipient's transaction (add points)
        const recipientTransaction = await prisma.transaction.create({
            data: {
                type: 'transfer',
                amount: amount, // Add points to recipient
                remark: remark || '',
                createdBy: senderUtorid,
                userId: recipient.id,
                relatedId: sender.id, // Related to the sender
            },
        });

        // Update sender's points balance
        await prisma.user.update({
            where: { id: sender.id },
            data: { points: sender.points - amount },
        });

        // Update recipient's points balance
        await prisma.user.update({
            where: { id: recipient.id },
            data: { points: recipient.points + amount },
        });

        // Respond with the sender's transaction details
        res.status(201).json({
            id: senderTransaction.id,
            sender: sender.utorid,
            recipient: recipient.utorid,
            type: senderTransaction.type,
            sent: amount,
            remark: senderTransaction.remark,
            createdBy: senderTransaction.createdBy,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Create a new redemption transaction.
app.post('/users/me/transactions', authenticateJWT, async (req, res) => {
    const { type, amount, remark } = req.body;
    const userId = req.user.id; // ID of the logged-in user
    const utorid = req.user.utorid; // utorid of the logged-in user

    // Validate required fields
    if (!type) {
        return res.status(400).json({ error: "type is required" });
    }

    // Validate type
    if (type !== 'redemption') {
        return res.status(400).json({ error: "type must be 'redemption'" });
    }

    // Validate amount (if provided)
    if (amount !== undefined) {
        if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
            return res.status(400).json({ error: "amount must be a positive integer" });
        }
    }

    try {
        // Fetch the logged-in user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                utorid: true,
                points: true,
                verified: true,
            },
        });

        // Check if the user is verified
        if (!user.verified) {
            return res.status(403).json({ error: "User is not verified" });
        }

        // Check if the user has enough points (if amount is provided)
        if (amount !== undefined && user.points < amount) {
            return res.status(400).json({ error: "Requested amount exceeds user's point balance" });
        }

        // Create the redemption transaction
        const transaction = await prisma.transaction.create({
            data: {
                type: 'redemption',
                amount: amount || 0, // Default to 0 if amount is not provided
                remark: remark || '',
                createdBy: utorid,
                userId: user.id,
                processedBy: null, // Initially unprocessed
            },
            select: {
                id: true,
                utorid: true,
                type: true,
                processedBy: true,
                amount: true,
                remark: true,
                createdBy: true,
            },
        });

        // Respond with the created transaction
        res.status(201).json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Retrieve a list of transactions owned by the currently logged in user
app.get('/users/me/transactions', authenticateJWT, async (req, res) => {
    const {
        type,
        relatedId,
        promotionId,
        amount,
        operator,
        page = 1,
        limit = 10,
    } = req.query;
    const userId = req.user.id; // ID of the logged-in user

    // Validate relatedId and type
    if (relatedId && !type) {
        return res.status(400).json({ error: "relatedId must be used with type" });
    }

    // Validate amount and operator
    if (amount && !operator) {
        return res.status(400).json({ error: "amount must be used with operator" });
    }
    if (operator && !['gte', 'lte'].includes(operator)) {
        return res.status(400).json({ error: "operator must be 'gte' or 'lte'" });
    }

    try {
        // Build the filter object
        const filter = { userId }; // Only include transactions owned by the logged-in user

        // Filter by type
        if (type) {
            filter.type = type;
        }

        // Filter by relatedId
        if (relatedId) {
            filter.relatedId = parseInt(relatedId);
        }

        // Filter by promotionId
        if (promotionId) {
            filter.promotions = { some: { id: parseInt(promotionId) } };
        }

        // Filter by amount and operator
        if (amount && operator) {
            filter.amount = { [operator]: parseInt(amount) };
        }

        // Fetch the total count of transactions matching the filters
        const count = await prisma.transaction.count({ where: filter });

        // Fetch the paginated list of transactions
        const transactions = await prisma.transaction.findMany({
            where: filter,
            include: {
                promotion: {
                    select: {
                        id: true,
                    },
                },
            },
            skip: (page - 1) * limit, // Pagination offset
            take: parseInt(limit), // Number of results per page
        });

        // Format the response
        const results = transactions.map(transaction => ({
            id: transaction.id,
            type: transaction.type,
            spent: transaction.spent,
            amount: transaction.amount,
            promotionIds: transaction.promotionId.map(promo => promo.id),
            remark: transaction.remark,
            createdBy: transaction.createdBy,
            relatedId: transaction.relatedId,
        }));

        // Respond with count and results
        res.status(200).json({ count, results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Set a redemption transaction as being completed
app.patch('/transactions/:transactionId/processed', authenticateJWT, checkRole('cashier'), async (req, res) => {
    const { transactionId } = req.params;
    const { processed } = req.body;
    const processedBy = req.user.utorid; // utorid of the cashier processing the transaction

    // Validate required field
    if (processed === undefined) {
        return res.status(400).json({ error: "processed field is required" });
    }

    // Validate processed value
    if (processed !== true) {
        return res.status(400).json({ error: "processed can only be true" });
    }

    try {
        // Fetch the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transactionId) },
            include: {
                user: {
                    select: {
                        id: true,
                        utorid: true,
                        points: true,
                    },
                },
            },
        });

        // Check if the transaction exists
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        // Check if the transaction is of type "redemption"
        if (transaction.type !== 'redemption') {
            return res.status(400).json({ error: "Transaction is not of type 'redemption'" });
        }

        // Check if the transaction has already been processed
        if (transaction.processedBy !== null) {
            return res.status(400).json({ error: "Transaction has already been processed" });
        }

        // Update the transaction as processed
        const updatedTransaction = await prisma.transaction.update({
            where: { id: parseInt(transactionId) },
            data: {
                processedBy,
            },
            include: {
                user: {
                    select: {
                        utorid: true,
                    },
                },
            },
        });

        // Deduct the redeemed amount from the user's points balance
        await prisma.user.update({
            where: { id: transaction.user.id },
            data: { points: transaction.user.points - transaction.amount },
        });

        // Format the response
        const response = {
            id: updatedTransaction.id,
            utorid: updatedTransaction.user.utorid,
            type: updatedTransaction.type,
            processedBy: updatedTransaction.processedBy,
            redeemed: updatedTransaction.amount,
            remark: updatedTransaction.remark,
            createdBy: updatedTransaction.createdBy,
        };

        // Respond with the updated transaction details
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create a new point-earning event.
app.post('/events', authenticateJWT, checkRole('manager'), async (req, res) => {
    const { name, description, location, startTime, endTime, capacity, points } = req.body;

    // Validate required fields
    if (!name || !description || !location || !startTime || !endTime || !points) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate points
    if (typeof points !== 'number' || points <= 0) {
        return res.status(400).json({ error: "Points must be a positive integer" });
    }

    // Validate capacity (if provided)
    if (capacity !== undefined && capacity !== null) {
        if (typeof capacity !== 'number' || capacity <= 0) {
            return res.status(400).json({ error: "Capacity must be a positive number or null" });
        }
    }

    // Validate startTime and endTime
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date format for startTime or endTime" });
    }

    if (end <= start) {
        return res.status(400).json({ error: "endTime must be after startTime" });
    }

    try {
        // Get the logged-in user's ID from the JWT
        const userId = req.user.id;

        // Create the event
        const event = await prisma.event.create({
            data: {
                name,
                description,
                location,
                startTime: start,
                endTime: end,
                capacity: capacity || null, // Set to null if capacity is not provided
                points,
                pointsRemain: points, // Initially, all points are remaining
                pointsAwarded: 0, // No points awarded yet
                published: false, // Event is not published by default
                organizers: {
                    connect: { id: userId }, // Add the event creator as an organizer
                },
            },
            include: {
                organizers: true, // Include organizers in the response
                guests: true, // Include guests in the response
            },
        });

        // Return the created event
        res.status(201).json({
            id: event.id,
            name: event.name,
            description: event.description,
            location: event.location,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            capacity: event.capacity,
            pointsRemain: event.pointsRemain,
            pointsAwarded: event.pointsAwarded,
            published: event.published,
            organizers: event.organizers.map(org => ({
                id: org.id,
                utorid: org.utorid,
                name: org.name,
            })),
            guests: event.guests.map(guest => ({
                id: guest.id,
                utorid: guest.utorid,
                name: guest.name,
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Retrieve a list of events
app.get('/events', authenticateJWT, async (req, res) => {
    try {
        const { name, location, started, ended, showFull, page = 1, limit = 10, published } = req.query;
        
        if(!page || !limit || parseInt(page) < 1 || parseInt(limit) > 10){
            return res.status(400).json({error: "Page or limit out of bounds"})
        }
        // Validate inputs
        if (started !== undefined && ended !== undefined) {
            return res.status(400).json({ error: "Cannot specify both 'started' and 'ended' filters." });
        }

        const currentTime = new Date();

        // Build the filter object
        const where = {};

        // Common filters for all roles**** CHANGED BY USMAN mode WASN't WOKRING
        if (name) where.name = { contains: name.toLowerCase() };
        if (location) where.location = { contains: location.toLowerCase() };
        

        // Started and ended filters
        if (started !== undefined) {
            if (started === 'true') {
                where.startTime = { lte: currentTime }; // Events that have started
            } else {
                where.startTime = { gt: currentTime }; // Events that have not started
            }
        }
        if (ended !== undefined) {
            if (ended === 'true') {
                where.endTime = { lte: currentTime }; // Events that have ended
            } else {
                where.endTime = { gt: currentTime }; // Events that have not ended
            }
        }
        // **** CHANGED BY USMAN FILTERING FOR FULL EVENTS

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const allMatchingEvents = await prisma.event.findMany({
            where,
            include: {
              eventAttendances: true,
            },
          });
          
          // Filter out full events if needed
          let filteredEvents = allMatchingEvents;
          if (showFull === 'false') {
            filteredEvents = allMatchingEvents.filter(event => {
              if (event.capacity == null) return true; // Treat as unlimited
              return event.eventAttendances.length < event.capacity;
            });
          }
          
          // Now apply pagination after filtering
          const paginatedEvents = filteredEvents.slice(skip, skip + take);

        //req.user = { role: 'manager' }; ///**** CHANGED BY USMAN NEED to revert
        // Role-specific filters
        if (req.user.role === 'regular' || req.user.role === 'cashier') {
            where.published = true; // Regular users can only see published events
        } else if (req.user.role === 'manager' || req.user.role === 'superuser') {
            if (published !== undefined) {
                where.published = published === 'true';
            }
        }


        // Format the response
        const formattedEvents = paginatedEvents.map(event => ({
            id: event.id,
            name: event.name,
            location: event.location,
            startTime: event.startTime,
            endTime: event.endTime,
            capacity: event.capacity,
            numGuests: event.eventAttendances.length,
            ...(req.user.role === 'manager' || req.user.role === 'superuser' ? {
                pointsRemain: event.pointsRemain,
                pointsAwarded: event.pointsAwarded,
                published: event.published,
            } : {}),
        }));

        // Get the total count for pagination
        const totalCount = await prisma.event.count({ where });

        // Send the response
        res.status(200).json({
            count: totalCount,
            results: formattedEvents,
        });

    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Retrieve a single event
app.get('/events/:eventId', authenticateJWT, async (req, res) => {

    try {
        const { eventId } = req.params;
        // console.log("eventId is: ", eventId)
        // console.log(await prisma.event.findUnique({where: {id: parseInt(eventId)}}))
        console.log("-------------------------------------------------get /events/:eventId: ", eventId, "req.params: ", req.params)
        //console.log("-----------------------BODY-------------------------get /events/:eventId req.body: ", req.body, " req.query: ", req.query)
        
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Find the event with organizers and guests
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) }, // Ensure eventId is a valid integer
            include: {
                organizers: {
                    select: {
                        id: true,
                        utorid: true,
                        name: true,
                    },
                },
                guests: {
                    select: {
                        id: true,
                        utorid: true,
                        name: true,
                    },
                },
                eventAttendances: true, // Include attendees to calculate numGuests
            },
        });
        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Regular user access
        if (req.user.role === 'regular' || req.user.role === 'cashier') {
            // Regular users can only see published events
            if (!event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Return basic event details
            return res.status(200).json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                organizers: event.organizers,
                numGuests: event.eventAttendances.length,
            });
        }

        // Manager, superuser, or organizer access
        if (!req.user.role ||
            req.user.role === 'manager' ||
            req.user.role === 'superuser' ||
            event.organizers.some(organizer => organizer.utorid === req.user.utorid)
        ) {
            // Return full event details
            return res.status(200).json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                pointsRemain: event.pointsRemain,
                pointsAwarded: event.pointsAwarded,
                published: event.published,
                organizers: event.organizers,
                guests: event.guests,
            });
        }

        // If the user is not authorized to view the event
        return res.status(403).json({ error: "Forbidden: You do not have permission to view this event" });

    } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Update an existing event
app.patch('/events/:eventId', authenticateJWT, async (req, res) => {

    //console.log("/events/:eventId parameters: " , req.params)
    const { eventId } = req.params;
    //console.log("-------------------------------------------------get /events/:eventId: ", eventId, "req.params: ", req.params)
    if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
        return res.status(400).json({ error: "Invalid or missing event ID" });
    }
    const { name, description, location, startTime, endTime, capacity, points, published } = req.body;

    try {
        // Find the event by ID
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                organizers: { select: { id: true, utorid: true } }, // Include organizers
                guests: { select: { id: true } }, // Include guests (for capacity validation)
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the user is a manager, superuser, or an organizer of the event
        const isManagerOrHigher = roleHierarchy[req.user.role] >= roleHierarchy['manager'];
        const isOrganizer = event.organizers.some(org => org.utorid === req.user.utorid);

        if (!isManagerOrHigher && !isOrganizer) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to update this event" });
        }

        // Validate updates
        const now = new Date();
        const updates = {};

        // Validate name, description, location, startTime, and capacity updates
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (location !== undefined) updates.location = location;

        if (startTime !== undefined) {
            const newStartTime = new Date(startTime);
            if (isNaN(newStartTime.getTime())) {
                return res.status(400).json({ error: "Invalid startTime format" });
            }
            if (newStartTime < now) {
                return res.status(400).json({ error: "startTime cannot be in the past" });
            }
            updates.startTime = newStartTime;
        }

        if (endTime !== undefined) {
            const newEndTime = new Date(endTime);
            if (isNaN(newEndTime.getTime())) {
                return res.status(400).json({ error: "Invalid endTime format" });
            }
            if (newEndTime < now) {
                return res.status(400).json({ error: "endTime cannot be in the past" });
            }
            if (startTime !== undefined && newEndTime <= new Date(startTime)) {
                return res.status(400).json({ error: "endTime must be after startTime" });
            }
            updates.endTime = newEndTime;
        }

        if (capacity !== undefined) {
            if (typeof capacity !== 'number' || capacity <= 0) {
                return res.status(400).json({ error: "Capacity must be a positive number or null" });
            }
            if (capacity < event.guests.length) {
                return res.status(400).json({ error: "Capacity cannot be less than the number of confirmed guests" });
            }
            updates.capacity = capacity;
        }

        // Validate points update (only for managers or higher)
        if (points !== undefined) {
            if (!isManagerOrHigher) {
                return res.status(403).json({ error: "Forbidden: Only managers can update points" });
            }
            if (typeof points !== 'number' || points <= 0) {
                return res.status(400).json({ error: "Points must be a positive integer" });
            }
            if (points < event.pointsAwarded) {
                return res.status(400).json({ error: "Points cannot be less than the points already awarded" });
            }
            updates.points = points;
            updates.pointsRemain = points - event.pointsAwarded;
        }

        // Validate published update (only for managers or higher)
        if (published !== undefined) {
            if (!isManagerOrHigher) {
                return res.status(403).json({ error: "Forbidden: Only managers can publish events" });
            }
            if (published !== true) {
                return res.status(400).json({ error: "Published can only be set to true" });
            }
            updates.published = true;
        }

        // Check if updates to name, description, location, startTime, or capacity are made after the original start time
        if (event.startTime < now) {
            const restrictedFields = ['name', 'description', 'location', 'startTime', 'capacity'];
            for (const field of restrictedFields) {
                if (updates[field] !== undefined) {
                    return res.status(400).json({ error: `Cannot update ${field} after the event has started` });
                }
            }
        }

        // Check if updates to endTime are made after the original end time
        if (event.endTime < now && updates.endTime !== undefined) {
            return res.status(400).json({ error: "Cannot update endTime after the event has ended" });
        }

        // Update the event
        const updatedEvent = await prisma.event.update({
            where: { id: parseInt(eventId) },
            data: updates,
            select: {
                id: true,
                name: true,
                location: true,
                description: updates.description !== undefined,
                startTime: updates.startTime !== undefined,
                endTime: updates.endTime !== undefined,
                capacity: updates.capacity !== undefined,
                points: updates.points !== undefined,
                pointsRemain: updates.points !== undefined,
                published: updates.published !== undefined,
            },
        });

        // Format the response
        const response = {
            id: updatedEvent.id,
            name: updatedEvent.name,
            location: updatedEvent.location,
        };

        if (updates.description !== undefined) response.description = updatedEvent.description;
        if (updates.startTime !== undefined) response.startTime = updatedEvent.startTime.toISOString();
        if (updates.endTime !== undefined) response.endTime = updatedEvent.endTime.toISOString();
        if (updates.capacity !== undefined) response.capacity = updatedEvent.capacity;
        if (updates.points !== undefined) response.points = updatedEvent.points;
        if (updates.pointsRemain !== undefined) response.pointsRemain = updatedEvent.pointsRemain;
        if (updates.published !== undefined) response.published = updatedEvent.published;

        // Return the response
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Remove the specified event
// In your backend delete endpoint
app.delete('/events/:eventId', authenticateJWT, checkRole('manager'), async (req, res) => {
    const { eventId } = req.params;
    const parsedEventId = parseInt(eventId);
    
    try {
        // First verify the event exists
        const event = await prisma.event.findUnique({
            where: { id: parsedEventId },
        });

        if (!event) {
            console.log("404 Event not found");
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if event is published
        if (event.published) {
            console.log("400 Cannot delete a published event");
            return res.status(400).json({ 
                error: "Cannot delete a published event"
            });
        }

        // Use a transaction to ensure all operations succeed or fail together
        await prisma.$transaction([
            // Delete all transactions associated with the event
            prisma.transaction.deleteMany({
                where: { eventId: parsedEventId }
            }),
            
            // Delete all event attendances
            prisma.eventAttendance.deleteMany({
                where: { eventId: parsedEventId }
            }),
            
            // Remove all organizer relationships (many-to-many)
            prisma.event.update({
                where: { id: parsedEventId },
                data: {
                    organizers: {
                        set: [] // Disconnect all organizers
                    },
                    guests: {
                        set: [] // Disconnect all guests
                    }
                }
            }),
            
            // Finally delete the event itself
            prisma.event.delete({
                where: { id: parsedEventId }
            })
        ]);

        return res.status(204).send();
    } catch (error) {
        console.error('Delete event error:', error);
        return res.status(500).json({ 
            error: "Internal server error",
            details: error.message 
        });
    }
});
app.post('/events/:eventId/organizers', authenticateJWT, checkRole('manager'), async (req, res) => {
    try {
        const { eventId } = req.params;
        const { utorid } = req.body;
        console.log("-------------------------------------------------get /events/:eventId/organizers", eventId, "req.params: ", req.params)
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Validate payload
        if (!utorid) {
            return res.status(400).json({ error: "Missing required field: utorid" });
        }

        // Find the event
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                organizers: {
                    select: {
                        id: true,
                        utorid: true,
                        name: true,
                    },
                },
                guests: {
                    select: {
                        id: true,
                        utorid: true,
                    },
                },
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the event has ended
        if (event.endTime <= new Date()) {
            return res.status(410).json({ error: "Event has ended" });
        }

        // Check if the user is already a guest
        const isGuest = event.guests.some(guest => guest.utorid === utorid);
        if (isGuest) {
            return res.status(400).json({ error: "User is registered as a guest. Remove them as a guest first." });
        }

        // Find the user to be added as an organizer
        const user = await prisma.user.findUnique({
            where: { utorid },
        });

        // Check if the user exists
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        // Check if the user is already an organizer
        const isOrganizer = event.organizers.some(organizer => organizer.utorid === utorid);
        if (isOrganizer) {
            return res.status(400).json({ error: "User is already an organizer" });
        }

        // Add the user as an organizer
        await prisma.event.update({
            where: { id: parseInt(eventId) },
            data: {
                organizers: {
                    connect: { id: user.id },
                },
            },
        });

        // Fetch the updated event with organizers
        const updatedEvent = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                organizers: {
                    select: {
                        id: true,
                        utorid: true,
                        name: true,
                    },
                },
            },
        });

        // Return the updated event
        res.status(201).json({
            id: updatedEvent.id,
            name: updatedEvent.name,
            location: updatedEvent.location,
            organizers: updatedEvent.organizers,
        });

    } catch (error) {
        console.error("Error adding organizer:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Delete an event organizer from an
app.delete('/events/:eventId/organizers/:userId', authenticateJWT, checkRole('manager'), async (req, res) => {
    try {
        const { eventId, userId } = req.params;
        console.log("-------------------------------------------------get /events/:eventId/organizers/:userId", eventId, "req.params: ", req.params)
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Find the event
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                organizers: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the user is an organizer of the event
        const isOrganizer = event.organizers.some(organizer => organizer.id === parseInt(userId));
        if (!isOrganizer) {
            return res.status(404).json({ error: "User is not an organizer of this event" });
        }

        // Remove the user as an organizer
        await prisma.event.update({
            where: { id: parseInt(eventId) },
            data: {
                organizers: {
                    disconnect: { id: parseInt(userId) },
                },
            },
        });

        // Return 204 No Content on success
        res.status(204).send();

    } catch (error) {
        console.error("Error removing organizer:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Add a guest to this event.
app.post('/events/:eventId/guests', authenticateJWT, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { utorid } = req.body;
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Validate payload
        if (!utorid) {
            return res.status(400).json({ error: "Missing required field: utorid" });
        }

        // Find the event
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                organizers: {
                    select: {
                        id: true,
                        utorid: true,
                    },
                },
                guests: {
                    select: {
                        id: true,
                        utorid: true,
                    },
                },
                eventAttendances: true, // Include attendees to calculate numGuests
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the user is authorized (manager, superuser, or organizer)
        const isAuthorized =
            req.user.role === 'manager' ||
            req.user.role === 'superuser' ||
            event.organizers.some(organizer => organizer.utorid === req.user.utorid);

        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to add guests to this event" });
        }

        // Check if the event is visible to the organizer
        if (req.user.role !== 'manager' && req.user.role !== 'superuser' && !event.published) {
            return res.status(404).json({ error: "Event is not visible" });
        }

        // Check if the event has ended
        if (event.endTime <= new Date()) {
            return res.status(410).json({ error: "Event has ended" });
        }

        // Check if the event is full
        if (event.capacity && event.eventAttendances.length >= event.capacity) {
            return res.status(410).json({ error: "Event is full" });
        }

        // Find the user to be added as a guest
        const user = await prisma.user.findUnique({
            where: { utorid },
            select: {
                id: true,
                utorid: true,
                name: true,
            },
        });

        // Check if the user exists
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if the user is already an organizer
        const isOrganizer = event.organizers.some(organizer => organizer.utorid === utorid);
        if (isOrganizer) {
            return res.status(400).json({ error: "User is registered as an organizer. Remove them as an organizer first." });
        }

        // Check if the user is already a guest
        const isGuest = event.guests.some(guest => guest.utorid === utorid);
        if (isGuest) {
            return res.status(400).json({ error: "User is already a guest" });
        }

        // Add the user as a guest
        await prisma.event.update({
            where: { id: parseInt(eventId) },
            data: {
                guests: {
                    connect: { id: user.id },
                },
            },
        });

        // Fetch the updated event with guests
        const updatedEvent = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                eventAttendances: true, // Include attendees to calculate numGuests
            },
        });

        // Return the response
        res.status(201).json({
            id: updatedEvent.id,
            name: updatedEvent.name,
            location: updatedEvent.location,
            guestAdded: user,
            numGuests: updatedEvent.eventAttendances.length,
        });

    } catch (error) {
        console.error("Error adding guest:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


//Remove a guest from this event.
app.delete('/events/:eventId/guests/:userId', authenticateJWT, checkRole('manager'), async (req, res) => {
    try {
        const { eventId, userId } = req.params;
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Find the event
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                guests: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the user is a guest of the event
        const isGuest = event.guests.some(guest => guest.id === parseInt(userId));
        if (!isGuest) {
            return res.status(404).json({ error: "User is not a guest of this event" });
        }

        // Remove the user as a guest
        await prisma.event.update({
            where: { id: parseInt(eventId) },
            data: {
                guests: {
                    disconnect: { id: parseInt(userId) },
                },
            },
        });

        // Return 204 No Content on success
        res.status(204).send();

    } catch (error) {
        console.error("Error removing guest:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


//Add the logged-in user to the event
app.post('/events/:eventId/guests/me', authenticateJWT, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { utorid } = req.user; // Get the logged-in user's utorid from the JWT
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Find the event
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                guests: {
                    select: {
                        id: true,
                        utorid: true,
                    },
                },
                eventAttendances: true, // Include attendees to calculate numGuests
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the event has ended
        if (event.endTime <= new Date()) {
            return res.status(410).json({ error: "Event has ended" });
        }

        // Check if the event is full
        if (event.capacity && event.eventAttendances.length >= event.capacity) {
            return res.status(410).json({ error: "Event is full" });
        }

        // Check if the user is already a guest
        const isGuest = event.guests.some(guest => guest.utorid === utorid);
        if (isGuest) {
            return res.status(400).json({ error: "User is already on the guest list" });
        }

        // Add the logged-in user as a guest
        await prisma.event.update({
            where: { id: parseInt(eventId) },
            data: {
                guests: {
                    connect: { utorid },
                },
            },
        });

        // Fetch the updated event with guests
        const updatedEvent = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                eventAttendances: true, // Include attendees to calculate numGuests
            },
        });

        // Fetch the logged-in user's details
        const user = await prisma.user.findUnique({
            where: { utorid },
            select: {
                id: true,
                utorid: true,
                name: true,
            },
        });

        // Return the response
        res.status(201).json({
            id: updatedEvent.id,
            name: updatedEvent.name,
            location: updatedEvent.location,
            guestAdded: user,
            numGuests: updatedEvent.eventAttendances.length,
        });

    } catch (error) {
        console.error("Error adding guest:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//Remove the logged-in user from this event.
app.delete('/events/:eventId/guests/me', authenticateJWT, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { utorid } = req.user; // Get the logged-in user's utorid from the JWT
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Find the event
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                guests: {
                    select: {
                        id: true,
                        utorid: true,
                    },
                },
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the event has ended
        if (event.endTime <= new Date()) {
            return res.status(410).json({ error: "Event has ended" });
        }

        // Check if the user is a guest of the event
        const isGuest = event.guests.some(guest => guest.utorid === utorid);
        if (!isGuest) {
            return res.status(404).json({ error: "User did not RSVP to this event" });
        }

        // Remove the logged-in user as a guest
        await prisma.event.update({
            where: { id: parseInt(eventId) },
            data: {
                guests: {
                    disconnect: { utorid },
                },
            },
        });

        // Return 204 No Content on success
        res.status(204).send();

    } catch (error) {
        console.error("Error removing guest:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// create a new reward transaction
app.post('/events/:eventId/transactions', authenticateJWT, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { type, utorid, amount, remark } = req.body;
        const createdBy = req.user.utorid; // Get the logged-in user's utorid from the JWT
        if (!eventId || eventId === 'None' || isNaN(parseInt(eventId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Validate payload
        if (type !== "event") {
            return res.status(400).json({ error: "Invalid transaction type. Must be 'event'." });
        }
        if (!amount || typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
            return res.status(400).json({ error: "Invalid amount. Must be a positive integer." });
        }

        // Find the event
        const event = await prisma.event.findUnique({
            where: { id: parseInt(eventId) },
            include: {
                guests: {
                    select: {
                        id: true,
                        utorid: true,
                    },
                },
            },
        });

        // Check if the event exists
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if the user is authorized (manager, superuser, or organizer)
        const isAuthorized =
            req.user.role === 'manager' ||
            req.user.role === 'superuser' ||
            event.organizers.some(organizer => organizer.utorid === req.user.utorid);

        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to create transactions for this event" });
        }

        // Check if the event has sufficient remaining points
        if (event.pointsRemain < amount * (utorid ? 1 : event.guests.length)) {
            return res.status(400).json({ error: "Insufficient remaining points for this transaction" });
        }

        // If utorid is specified, award points to a single guest
        if (utorid) {
            // Check if the user is on the guest list
            const isGuest = event.guests.some(guest => guest.utorid === utorid);
            if (!isGuest) {
                return res.status(400).json({ error: "User is not on the guest list" });
            }

            // Find the user to award points
            const user = await prisma.user.findUnique({
                where: { utorid },
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Create the transaction
            const transaction = await prisma.transaction.create({
                data: {
                    type: "event",
                    amount: amount,
                    remark: remark || null,
                    createdBy: createdBy,
                    userId: user.id,
                    eventId: event.id,
                },
            });

            // Update the user's points
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    points: { increment: amount },
                },
            });

            // Update the event's remaining points
            await prisma.event.update({
                where: { id: event.id },
                data: {
                    pointsRemain: { decrement: amount },
                    pointsAwarded: { increment: amount },
                },
            });

            // Return the response
            return res.status(201).json({
                id: transaction.id,
                recipient: user.utorid,
                awarded: amount,
                type: "event",
                relatedId: event.id,
                remark: transaction.remark,
                createdBy: createdBy,
            });
        }

        // If utorid is not specified, award points to all guests
        const transactions = [];
        for (const guest of event.guests) {
            // Create a transaction for each guest
            const transaction = await prisma.transaction.create({
                data: {
                    type: "event",
                    amount: amount,
                    remark: remark || null,
                    createdBy: createdBy,
                    userId: guest.id,
                    eventId: event.id,
                },
            });

            // Update the guest's points
            await prisma.user.update({
                where: { id: guest.id },
                data: {
                    points: { increment: amount },
                },
            });

            // Add the transaction to the response
            transactions.push({
                id: transaction.id,
                recipient: guest.utorid,
                awarded: amount,
                type: "event",
                relatedId: event.id,
                remark: transaction.remark,
                createdBy: createdBy,
            });
        }

        // Update the event's remaining points
        await prisma.event.update({
            where: { id: event.id },
            data: {
                pointsRemain: { decrement: amount * event.guests.length },
                pointsAwarded: { increment: amount * event.guests.length },
            },
        });

        // Return the response
        return res.status(201).json(transactions);

    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ------------------------------------------------------------------------------- Promotions

//Create a new promotion
app.post('/promotions', authenticateJWT, checkRole('manager'), async (req, res) => {
    try {
        const { name, description, type, startTime, endTime, minSpending, rate, points } = req.body;
        const createdBy = req.user.utorid; // Get the logged-in user's utorid from the JWT

        // Validate required fields
        if (!name || !description || !type || !startTime || !endTime) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Validate type
        if (type !== "automatic" && type !== "one-time") {
            return res.status(400).json({ error: "Invalid promotion type. Must be 'automatic' or 'one-time'." });
        }

        // Validate startTime and endTime
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: "Invalid date format. Use ISO 8601." });
        }

        if (start <= now) {
            return res.status(400).json({ error: "Start time must be in the future." });
        }

        if (end <= start) {
            return res.status(400).json({ error: "End time must be after start time." });
        }

        // Validate minSpending
        if (minSpending !== undefined && (typeof minSpending !== "number" || minSpending <= 0)) {
            return res.status(400).json({ error: "Invalid minSpending. Must be a positive number." });
        }

        // Validate rate
        if (rate !== undefined && (typeof rate !== "number" || rate <= 0)) {
            return res.status(400).json({ error: "Invalid rate. Must be a positive number." });
        }

        // Validate points
        if (points !== undefined && (typeof points !== "number" || points <= 0 || !Number.isInteger(points))) {
            return res.status(400).json({ error: "Invalid points. Must be a positive integer." });
        }

        // Create the promotion
        const promotion = await prisma.promotion.create({
            data: {
                name,
                description,
                type,
                startTime: start,
                endTime: end,
                minSpending: minSpending || null,
                rate: rate || null,
                points: points || null,
                createdBy,
                userId: req.user.id, // Associate the promotion with the logged-in user
            },
        });

        // Return the response
        res.status(201).json({
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            type: promotion.type,
            startTime: promotion.startTime.toISOString(),
            endTime: promotion.endTime.toISOString(),
            minSpending: promotion.minSpending,
            rate: promotion.rate,
            points: promotion.points,
        });

    } catch (error) {
        console.error("Error creating promotion:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// retrieve a list of promotions
app.get('/promotions', authenticateJWT, async (req, res) => {
    try {
        const { name, type, started, ended, page = 1, limit = 10 } = req.query;
        const now = new Date();

        if(!page || !limit || parseInt(page) < 1 || parseInt(limit) > 10){
            return res.status(400).json({error: "Page or limit out of bounds"})
        }

        // Validate inputs
        if (started !== undefined && ended !== undefined) {
            return res.status(400).json({ error: "Cannot specify both 'started' and 'ended' filters." });
        }

        // Build the filter object
        const where = {};

        // Common filters for all roles **** CHANGED BY USMAN mode WASN't WOKRING
        if (name) where.name = { contains: name.toLowerCase() };
        if (type) where.type = type;

        // Role-specific filters
        if (req.user.role === 'regular') {
            // Regular users can only see active promotions they haven't used
            where.startTime = { lte: now }; // Promotions that have started
            where.endTime = { gte: now }; // Promotions that have not ended

            // Exclude promotions the user has already used
            const usedPromotions = await prisma.transaction.findMany({
                where: {
                    userId: req.user.id,
                    promotionId: { not: null },
                },
                select: {
                    promotionId: true,
                },
            });

            const usedPromotionIds = usedPromotions.map(t => t.promotionId);
            if (usedPromotionIds.length > 0) {
                where.id = { notIn: usedPromotionIds };
            }
        } else if (req.user.role === 'manager' || req.user.role === 'superuser') {
            // Managers and superusers can see all promotions with additional filters
            if (started !== undefined) {
                if (started === 'true') {
                    where.startTime = { lte: now }; // Promotions that have started
                } else {
                    where.startTime = { gt: now }; // Promotions that have not started
                }
            }
            if (ended !== undefined) {
                if (ended === 'true') {
                    where.endTime = { lte: now }; // Promotions that have ended
                } else {
                    where.endTime = { gt: now }; // Promotions that have not ended
                }
            }
        }

        // Pagination
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        // Query the database
        const promotions = await prisma.promotion.findMany({
            where,
            skip,
            take,
            select: {
                id: true,
                name: true,
                type: true,
                startTime: true,
                endTime: true,
                minSpending: true,
                rate: true,
                points: true,
            },
        });

        // Get the total count for pagination
        const totalCount = await prisma.promotion.count({ where });

        // Format the response
        const formattedPromotions = promotions.map(promotion => ({
            id: promotion.id,
            name: promotion.name,
            type: promotion.type,
            startTime: promotion.startTime.toISOString(),
            endTime: promotion.endTime.toISOString(),
            minSpending: promotion.minSpending,
            rate: promotion.rate,
            points: promotion.points,
        }));

        // Send the response
        res.status(200).json({
            count: totalCount,
            results: formattedPromotions,
        });

    } catch (error) {
        console.error("Error fetching promotions:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Retrieve a single event
app.get('/promotions/:promotionId', authenticateJWT, async (req, res) => {

    
    try {
        const { promotionId } = req.params;
        const now = new Date();

        if (!promotionId || promotionId === 'None' || isNaN(parseInt(promotionId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }

        // Find the promotion
        const promotion = await prisma.promotion.findUnique({
            where: { id: parseInt(promotionId) },
        });

        // Check if the promotion exists
        if (!promotion) {
            return res.status(404).json({ error: "Promotion not found" });
        }

        // Regular user access
        if (req.user.role === 'regular' || req.user.role === 'cashier') {
            // Regular users can only see active promotions
            if (promotion.startTime > now || promotion.endTime < now) {
                return res.status(404).json({ error: "Promotion is currently inactive" });
            }

            // Return basic promotion details
            return res.status(200).json({
                id: promotion.id,
                name: promotion.name,
                description: promotion.description,
                type: promotion.type,
                endTime: promotion.endTime.toISOString(),
                minSpending: promotion.minSpending,
                rate: promotion.rate,
                points: promotion.points,
            });
        }

        // Manager or superuser access
        if (req.user.role === 'manager' || req.user.role === 'superuser') {
            // Return full promotion details
            return res.status(200).json({
                id: promotion.id,
                name: promotion.name,
                description: promotion.description,
                type: promotion.type,
                startTime: promotion.startTime.toISOString(),
                endTime: promotion.endTime.toISOString(),
                minSpending: promotion.minSpending,
                rate: promotion.rate,
                points: promotion.points,
            });
        }

        // If the user is not authorized
        return res.status(403).json({ error: "Forbidden: You do not have permission to view this promotion" });

    } catch (error) {
        console.error("Error fetching promotion:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Update an existing promotion
app.patch('/promotions/:promotionId', authenticateJWT, checkRole('manager'), async (req, res) => {
    try {
        const { promotionId } = req.params;
        const { name, description, type, startTime, endTime, minSpending, rate, points } = req.body;
        const now = new Date();

        // Find the promotion
        const promotion = await prisma.promotion.findUnique({
            where: { id: parseInt(promotionId) },
        });

        // Check if the promotion exists
        if (!promotion) {
            return res.status(404).json({ error: "Promotion not found" });
        }

        // Validate startTime and endTime
        const newStartTime = startTime ? new Date(startTime) : null;
        const newEndTime = endTime ? new Date(endTime) : null;

        if (newStartTime && isNaN(newStartTime.getTime())) {
            return res.status(400).json({ error: "Invalid startTime format. Use ISO 8601." });
        }
        if (newEndTime && isNaN(newEndTime.getTime())) {
            return res.status(400).json({ error: "Invalid endTime format. Use ISO 8601." });
        }

        // Check if startTime or endTime is in the past
        if ((newStartTime && newStartTime < now) || (newEndTime && newEndTime < now)) {
            return res.status(400).json({ error: "startTime or endTime cannot be in the past." });
        }

        // Check if endTime is before startTime
        if (newStartTime && newEndTime && newEndTime <= newStartTime) {
            return res.status(400).json({ error: "endTime must be after startTime." });
        }

        // Check if updates are made after the original start time has passed
        const originalStartTime = new Date(promotion.startTime);
        if (originalStartTime <= now) {
            const disallowedFields = ['name', 'description', 'type', 'startTime', 'minSpending', 'rate', 'points'];
            const hasDisallowedUpdate = Object.keys(req.body).some(field => disallowedFields.includes(field));
            if (hasDisallowedUpdate) {
                return res.status(400).json({ error: "Cannot update name, description, type, startTime, minSpending, rate, or points after the promotion has started." });
            }
        }

        // Check if endTime is updated after the original end time has passed
        const originalEndTime = new Date(promotion.endTime);
        if (originalEndTime <= now && endTime) {
            return res.status(400).json({ error: "Cannot update endTime after the promotion has ended." });
        }

        // Build the update data object
        const updateData = {};
        if(!name){return res.status(400).json({error: "missing name for promotion"})}


        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type;
        if (startTime !== undefined) updateData.startTime = newStartTime;
        if (endTime !== undefined) updateData.endTime = newEndTime;
        if (minSpending !== undefined) updateData.minSpending = minSpending;
        if (rate !== undefined) updateData.rate = rate;
        if (points !== undefined) updateData.points = points;

        // Update the promotion
        const updatedPromotion = await prisma.promotion.update({
            where: { id: parseInt(promotionId) },
            data: updateData,
        });

        // Build the response object
        const response = {
            id: updatedPromotion.id,
            name: updatedPromotion.name,
            type: updatedPromotion.type,
        };

        // Include only the updated fields in the response
        if (name !== undefined) response.name = updatedPromotion.name;
        if (description !== undefined) response.description = updatedPromotion.description;
        if (type !== undefined) response.type = updatedPromotion.type;
        if (startTime !== undefined) response.startTime = updatedPromotion.startTime.toISOString();
        if (endTime !== undefined) response.endTime = updatedPromotion.endTime.toISOString();
        if (minSpending !== undefined) response.minSpending = updatedPromotion.minSpending;
        if (rate !== undefined) response.rate = updatedPromotion.rate;
        if (points !== undefined) response.points = updatedPromotion.points;

        // Return the response
        res.status(200).json(response);

    } catch (error) {
        console.error("Error updating promotion:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


//Remove the specified promotion.
app.delete('/promotions/:promotionId', authenticateJWT, checkRole('manager'), async (req, res) => {
    try {
        const { promotionId } = req.params;
        const now = new Date();

        if (!promotionId || promotionId === 'None' || isNaN(parseInt(promotionId, 10))) {
            return res.status(400).json({ error: "Invalid or missing event ID" });
        }
        // Find the promotion
        const promotion = await prisma.promotion.findUnique({
            where: { id: parseInt(promotionId) },
        });

        // Check if the promotion exists
        if (!promotion) {
            return res.status(404).json({ error: "Promotion not found" });
        }

        // Check if the promotion has already started
        if (new Date(promotion.startTime) <= now) {
            return res.status(403).json({ error: "Forbidden: Promotion has already started and cannot be deleted." });
        }

        // Delete the promotion
        await prisma.promotion.delete({
            where: { id: parseInt(promotionId) },
        });

        // Return 204 No Content on success
        res.status(204).send();

    } catch (error) {
        console.error("Error deleting promotion:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});