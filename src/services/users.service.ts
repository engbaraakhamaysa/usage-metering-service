import {
  findAllUsers,
  findUserById,
  insertUser,
} from "../repositories/users.repository.js";

// Get all users
export async function getAllUsers() {
  return findAllUsers();
}

// Get a user by ID
export async function getUserById(id: string) {
  return findUserById(id);
}

// Create a new user
export async function createUser(
  data: typeof import("../db/schema/users.js").users.$inferInsert,
) {
  return insertUser(data);
}
