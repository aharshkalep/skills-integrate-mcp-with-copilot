document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const userIcon = document.getElementById("user-icon");
  const userDropdown = document.getElementById("user-dropdown");
  const closeModal = document.querySelector(".close");
  const loginError = document.getElementById("login-error");
  const authNotice = document.getElementById("auth-notice");
  const signupBtn = document.getElementById("signup-btn");
  
  let isAuthenticated = false;

  // Check authentication status on page load
  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const data = await response.json();
      isAuthenticated = data.authenticated;
      
      updateUIForAuthStatus(data);
    } catch (error) {
      console.error("Error checking auth status:", error);
      isAuthenticated = false;
      updateUIForAuthStatus({ authenticated: false });
    }
  }

  // Update UI based on authentication status
  function updateUIForAuthStatus(authData) {
    const loggedInMenu = document.getElementById("logged-in-menu");
    const loggedOutMenu = document.getElementById("logged-out-menu");
    const usernameDisplay = document.getElementById("username-display");
    
    if (authData.authenticated) {
      loggedInMenu.classList.remove("hidden");
      loggedOutMenu.classList.add("hidden");
      usernameDisplay.textContent = authData.username || "Teacher";
      signupBtn.disabled = false;
      authNotice.classList.add("hidden");
      
      // Show delete buttons
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.classList.remove("hidden");
      });
    } else {
      loggedInMenu.classList.add("hidden");
      loggedOutMenu.classList.remove("hidden");
      signupBtn.disabled = true;
      authNotice.classList.remove("hidden");
      
      // Hide delete buttons
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.classList.add("hidden");
      });
    }
  }

  // Toggle user dropdown
  userIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!userDropdown.contains(e.target) && e.target !== userIcon) {
      userDropdown.classList.add("hidden");
    }
  });

  // Show login modal
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userDropdown.classList.add("hidden");
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginError.classList.add("hidden");
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      loginError.classList.add("hidden");
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginError.classList.add("hidden");
        isAuthenticated = true;
        await checkAuthStatus();
        
        messageDiv.textContent = "Login successful!";
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 3000);
        
        // Refresh activities to show delete buttons
        fetchActivities();
      } else {
        loginError.textContent = result.detail || "Invalid credentials";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
      isAuthenticated = false;
      await checkAuthStatus();
      userDropdown.classList.add("hidden");
      
      messageDiv.textContent = "Logged out successfully";
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 3000);
      
      // Refresh activities to hide delete buttons
      fetchActivities();
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and dropdown options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (hidden if not authenticated)
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn ${!isAuthenticated ? 'hidden' : ''}" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!isAuthenticated) {
      messageDiv.textContent = "Please log in to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      messageDiv.textContent = "Please log in to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkAuthStatus().then(() => {
    fetchActivities();
  });
});
