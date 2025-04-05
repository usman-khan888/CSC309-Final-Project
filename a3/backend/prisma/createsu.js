/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrypt = require('bcrypt');

const args = process.argv.slice(2);
if (args.length !== 3) {
    console.error("Usage: node prisma/createsu.js <utorid> <email> <password>");
    process.exit(1);
}

const [utorid, email, password] = args;

const createSuperuser = async () => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                utorid,
                email,
                password: hashedPassword,
                role: 'superuser',
                verified: true,
                name: "default",
            },
        });

        console.log(`Superuser created with ID: ${user.id}`);
    } catch (error) {
        console.error('Error creating superuser:', error);
    } finally {
        await prisma.$disconnect();
    }
};

createSuperuser();