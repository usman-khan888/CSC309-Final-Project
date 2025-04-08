'use strict';
const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper functions
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const transactionTypes = ['purchase', 'adjustment', 'redemption', 'transfer', 'event'];

const roles = ['regular', 'cashier', 'manager', 'superuser'];

async function seedDatabase() {
  try {
    // Clear existing data (in correct order to respect foreign keys)
    await prisma.eventAttendance.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    console.log('Database cleared');

    // Create users
    const users = [];
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create 7 regular users
    for (let i = 0; i < 7; i++) {
      const user = await prisma.user.create({
        data: {
          utorid: `utor${faker.string.alphanumeric(8)}`,
          name: faker.person.fullName(),
          email: `${faker.string.alphanumeric(8)}@mail.utoronto.ca`, // UofT email
          password: passwordHash,
          role: 'regular',
          verified: faker.datatype.boolean(),
          birthday: faker.date.past({ years: 30 }),
          points: getRandomInt(0, 1000),
          avatarUrl: faker.image.avatar(),
        }
      });
      users.push(user);
    }

    // Create 1 cashier
    const cashier = await prisma.user.create({
      data: {
        utorid: 'cashier1',
        name: 'Cashier User',
        email: 'cashier123@mail.utoronto.ca',
        password: passwordHash,
        role: 'cashier',
        verified: true,
        points: 0,
      }
    });
    users.push(cashier);

    // Create 1 manager
    const manager = await prisma.user.create({
      data: {
        utorid: 'manager1',
        name: 'Manager User',
        email: 'manager123@mail.utoronto.ca', // UofT email
        password: passwordHash,
        role: 'manager',
        verified: true,
        points: 0,
      }
    });
    users.push(manager);

    // Create 1 superuser
    const superuser = await prisma.user.create({
      data: {
        utorid: 'admin',
        name: 'Admin User',
        email: 'admin123@mail.utoronto.ca', // UofT email
        password: passwordHash,
        role: 'superuser',
        verified: true,
        points: 0,
      }
    });
    users.push(superuser);

    console.log('Users created');

    // Create events (at least 5)
    const events = [];
    for (let i = 0; i < 5; i++) {
      const startTime = faker.date.future();
      const endTime = new Date(startTime.getTime() + getRandomInt(1, 4) * 60 * 60 * 1000);
      
      const event = await prisma.event.create({
        data: {
          name: faker.lorem.words(3),
          description: faker.lorem.paragraph(),
          location: faker.location.streetAddress(),
          startTime,
          endTime,
          capacity: getRandomInt(10, 100),
          points: getRandomInt(100, 1000),
          pointsRemain: getRandomInt(100, 1000),
          pointsAwarded: 0,
          published: faker.datatype.boolean(),
          organizers: {
            connect: [{ id: manager.id }] // Manager organizes events
          }
        }
      });
      events.push(event);
    }
    const startTime = faker.date.future();
    const endTime = new Date(startTime.getTime() + getRandomInt(1, 4) * 60 * 60 * 1000);
    const full_event = await prisma.event.create({
      data: {
        name: faker.lorem.words(3),
        description: faker.lorem.paragraph(),
        location: faker.location.streetAddress(),
        startTime,
        endTime,
        capacity: 10,
        points: getRandomInt(100, 1000),
        pointsRemain: getRandomInt(100, 1000),
        pointsAwarded: 0,
        published: faker.datatype.boolean(),
        organizers: {
          connect: [{ id: manager.id }] // Manager organizes events
        }
      }
    });
    events.push(full_event);

    console.log('Events created');

    // Create promotions (at least 5)
    const promotions = [];
    for (let i = 0; i < 5; i++) {
      const startTime = faker.date.recent();
      const endTime = new Date(startTime.getTime() + getRandomInt(1, 30) * 24 * 60 * 60 * 1000);
      const isAutomatic = faker.datatype.boolean();
      
      const promotion = await prisma.promotion.create({
        data: {
          name: faker.commerce.productName() + ' Promotion',
          description: faker.lorem.sentence(),
          type: isAutomatic ? 'automatic' : 'one-time',
          startTime,
          endTime,
          minSpending: isAutomatic ? getRandomInt(5, 50) : null,
          rate: isAutomatic ? getRandomInt(1, 5) / 100 : null,
          points: isAutomatic ? null : getRandomInt(50, 200),
          createdBy: manager.utorid,
          userId: manager.id
        }
      });
      promotions.push(promotion);
    }

    console.log('Promotions created');

    // Create transactions (at least 30, with 2 of each type)
    const transactions = [];
    for (let i = 0; i < transactionTypes.length; i++) {
      const type = transactionTypes[i];
      
      // Create at least 2 of each type
      for (let j = 0; j < 2; j++) {
        const user = users[getRandomInt(0, users.length - 1)];
        const createdByUser = [cashier, manager, superuser][getRandomInt(0, 2)];
        
        const transactionData = {
          type,
          remark: faker.lorem.sentence(),
          createdAt: faker.date.recent(),
          createdBy: createdByUser.utorid,
          userId: user.id,
          suspicious: faker.datatype.boolean({ probability: 0.1 })
        };

        // Add type-specific fields
        if (type === 'purchase') {
          transactionData.spent = parseFloat(faker.finance.amount(5, 100, 2));
          transactionData.earned = Math.floor(transactionData.spent * 10); // 10 points per dollar
          transactionData.amount = transactionData.earned;
        } else if (type === 'redemption') {
          transactionData.amount = -getRandomInt(100, 500);
        } else if (type === 'event') {
          const event = events[getRandomInt(0, events.length - 1)];
          transactionData.eventId = event.id;
          transactionData.amount = getRandomInt(50, 200);
        } else if (type === 'adjustment') {
          transactionData.amount = getRandomInt(-100, 100);
        }

        // Occasionally add a promotion
        if (faker.datatype.boolean({ probability: 0.3 })) {
          transactionData.promotionId = promotions[getRandomInt(0, promotions.length - 1)].id;
        }

        const transaction = await prisma.transaction.create({
          data: transactionData
        });
        transactions.push(transaction);
      }
    }

    // Create remaining transactions to reach at least 30
    while (transactions.length < 30) {
      const type = transactionTypes[getRandomInt(0, transactionTypes.length - 1)];
      const user = users[getRandomInt(0, users.length - 1)];
      const createdByUser = [cashier, manager, superuser][getRandomInt(0, 2)];
      
      const transactionData = {
        type,
        remark: faker.lorem.sentence(),
        createdAt: faker.date.recent(),
        createdBy: createdByUser.utorid,
        userId: user.id,
        suspicious: faker.datatype.boolean({ probability: 0.1 })
      };

      if (type === 'purchase') {
        transactionData.spent = parseFloat(faker.finance.amount(5, 100, 2));
        transactionData.earned = Math.floor(transactionData.spent * 10);
        transactionData.amount = transactionData.earned;
      } else if (type === 'redemption') {
        transactionData.amount = -getRandomInt(100, 500);
      }

      const transaction = await prisma.transaction.create({
        data: transactionData
      });
      transactions.push(transaction);
    }

    console.log('Transactions created');

    // Create event attendances
for (const event of events) {
    // Get random number of attendees (between 5 and 20)
    const attendeeCount = getRandomInt(5, 20);
    const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < Math.min(attendeeCount, shuffledUsers.length); i++) {
      await prisma.eventAttendance.create({
        data: {
          userId: shuffledUsers[i].id,
          eventId: event.id
        }
      });
  
      // Occasionally create a transaction for attending the event
      if (faker.datatype.boolean({ probability: 0.5 })) {
        // Use event.endTime instead of startTime if it's in the future
        const maxDate = event.startTime > new Date() ? event.endTime : new Date();
        
        await prisma.transaction.create({
          data: {
            type: 'event',
            amount: getRandomInt(50, 200),
            remark: `Points for attending ${event.name}`,
            createdAt: faker.date.between({
              from: event.startTime,
              to: maxDate
            }),
            createdBy: manager.utorid,
            userId: shuffledUsers[i].id,
            eventId: event.id
          }
        });
      }
    }
  }
    console.log('Event attendances created');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();