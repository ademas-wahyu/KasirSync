// User management test suite - barrel file
// Run all user tests with: bun test tests/users/

// Each test module is auto-discovered by Bun test runner
export {};

// Import all test modules so they are picked up when running this file directly
import './create.test';
import './list.test';
import './get.test';
import './update.test';
import './update-status.test';
import './update-password.test';
