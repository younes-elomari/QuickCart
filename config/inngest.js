import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/User";
import Order from "@/models/Order";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "quickcart-next" });

// Inngest function to save user data to our database
export const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
  },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      imageUrl: image_url,
    };

    await connectDB();

    // the catch method dos not exist on original code
    // it was added to handle errors when creating a user
    // this is because the user may already exist in the database
    await User.create(userData).catch((error) => {
      console.log("Error creating user:", error);
    });
  }
);

// Inngest function to update user data in
export const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
  },
  {
    event: "clerk/user.updated",
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      imageUrl: image_url,
    };
    await connectDB();
    await User.findByIdAndUpdate(id, userData);
  }
);

// Ingest function to delete user data from our database
export const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
  },
  {
    event: "clerk/user.deleted",
  },
  async ({ event }) => {
    const { id } = event.data;
    await connectDB();
    await User.findByIdAndDelete(id).catch((error) => {
      console.log("Error deleting user:", error);
    });
  }
);

// Inngest function to create user's order in database

export const createUserOrder = inngest.createFunction(
  {
    id: "create-user-order",
    batchEvents: {
      maxSize: 5,
      timeout: "5s",
    },
    // Add retries for database operations
    retries: 3,
  },
  { event: "order/created" },
  async ({ events, logger }) => {
    try {
      // Validate and transform events
      const orders = events.map((event) => {
        if (!event.data.userId || !event.data.items) {
          throw new Error(`Invalid order data: ${JSON.stringify(event.data)}`);
        }

        return {
          userId: event.data.userId,
          items: event.data.items,
          amount: event.data.amount, // Fixed typo (was 'ammount')
          address: event.data.address,
          date: event.data.date || new Date(), // Default to now if not provided
        };
      });

      logger.debug(`Processing ${orders.length} orders`);

      // Ensure database connection is established
      const db = await connectDB(); // Make sure connectDB returns the connection

      // Insert orders with error handling
      const result = await Order.insertMany(orders, { ordered: false }); // Continue on error

      logger.debug(`Inserted ${result.length} orders`);

      return {
        success: true,
        processed: result.length,
        insertedCount: result.insertedCount,
      };
    } catch (error) {
      logger.error("Failed to create orders:", error);
      throw error; // Let Inngest handle retries
    }
  }
);

// export const createUserOrder = inngest.createFunction(
//   {
//     id: "create-user-order",
//     batchEvents: {
//       maxSize: 5,
//       timeout: "5s",
//     },
//   },
//   { event: "order/created" },
//   async ({ events }) => {
//     const orders = events.map((event) => {
//       return {
//         userId: event.data.userId,
//         items: event.data.items,
//         amount: event.data.ammount,
//         address: event.data.address,
//         date: event.data.date,
//       };
//     });

//     console.log("orders");

//     await connectDB();
//     await Order.insertMany(orders);

//     return { success: true, processed: orders.length };
//   }
// );
