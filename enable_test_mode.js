// Quick script to enable test mode in the frontend
// Run this in browser console on http://localhost:5174

const testUser = {
  id: 1,
  email: "test@taskmaster.com",
  username: "testuser",
  full_name: "Test User",
  role: "developer"
};

const authData = {
  state: {
    user: testUser,
    accessToken: "test-token-for-development",
    refreshToken: "test-token-for-development",
    isAuthenticated: true
  },
  version: 0
};

localStorage.setItem('auth-storage', JSON.stringify(authData));
console.log("✅ Test mode enabled! Refresh the page.");
console.log("You can now use the recorder without registration.");

// Made with Bob
