'use strict';

// Advanced Live Server Test Application
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Advanced Live Server Test App Loaded');

  // DOM elements
  const testButton = document.getElementById('testButton');
  const output = document.getElementById('output');
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');

  let clickCount = 0;

  // Test button functionality
  testButton.addEventListener('click', function () {
    clickCount++;
    const timestamp = new Date().toLocaleTimeString();

    const newDiv = document.createElement('div');
    newDiv.textContent = `[${timestamp}] Button clicked ${clickCount} time${clickCount > 1 ? 's' : ''}`;
    output.appendChild(newDiv);

    // Scroll to bottom of output
    output.scrollTop = output.scrollHeight;

    // Add some visual feedback
    testButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      testButton.style.transform = 'scale(1)';
    }, 100);

    // Log button clicks (quietly)
    console.log(`Button clicked ${clickCount} times`);
  });

  // Status indicator updates
  function updateStatus(connected) {
    if (connected) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected to Live Server';
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Disconnected';
    }
  }

  // Check WebSocket connection status
  function checkWebSocketStatus() {
    // Simple check for WebSocket connection
    if (
      window.liveServerWebSocket &&
      window.liveServerWebSocket.readyState === 1
    ) {
      updateStatus(true);
    } else {
      updateStatus(false);
    }
  }

  // Check status every 500ms
  setInterval(checkWebSocketStatus, 500);

  // Initial status check after a short delay
  setTimeout(checkWebSocketStatus, 1000);

  // Add some interactive features
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('click', function () {
      const title = this.querySelector('h3').textContent;
      const newDiv = document.createElement('div');
      newDiv.textContent = `[${new Date().toLocaleTimeString()}] Feature clicked: ${title}`;
      output.appendChild(newDiv);
      output.scrollTop = output.scrollHeight;
    });
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'r':
          event.preventDefault();
          const newDiv = document.createElement('div');
          newDiv.textContent = `[${new Date().toLocaleTimeString()}] Manual reload triggered (Ctrl+R)`;
          output.appendChild(newDiv);
          output.scrollTop = output.scrollHeight;
          break;
        case 'l':
          event.preventDefault();
          output.innerHTML = '';
          break;
      }
    }
  });

  // Add some periodic updates to show live functionality
  setInterval(() => {
    const now = new Date();
    if (now.getSeconds() === 0) {
      const newDiv = document.createElement('div');
      newDiv.textContent = `[${now.toLocaleTimeString()}] Server is running smoothly! 🎉`;
      output.appendChild(newDiv);
      output.scrollTop = output.scrollHeight;
    }
  }, 1000);

  // Error simulation removed - was too intrusive (v2)

  // Add some DOM manipulation to show live updates
  let colorIndex = 0;
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

  setInterval(() => {
    const header = document.querySelector('header h1');
    if (header) {
      header.style.color = colors[colorIndex];
      colorIndex = (colorIndex + 1) % colors.length;
    }
  }, 2000);

  // Add some performance monitoring
  const startTime = performance.now();
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
    const newDiv = document.createElement('div');
    newDiv.textContent = `[${new Date().toLocaleTimeString()}] Page loaded in ${loadTime.toFixed(2)}ms`;
    output.appendChild(newDiv);
  });

  // Add some accessibility features
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });

  document.addEventListener('mousedown', function () {
    document.body.classList.remove('keyboard-navigation');
  });

  // Add some responsive design testing
  function updateResponsiveInfo() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = width > height ? 'landscape' : 'portrait';

    // Update output with responsive info
    let responsiveInfo = document.getElementById('responsive-info');
    if (!responsiveInfo) {
      responsiveInfo = document.createElement('div');
      responsiveInfo.id = 'responsive-info';
      responsiveInfo.style.cssText =
        'position: fixed; bottom: 10px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; z-index: 1000;';
      document.body.appendChild(responsiveInfo);
    }

    if (responsiveInfo) {
      responsiveInfo.textContent = `${width}x${height} (${orientation})`;
    }
  }

  window.addEventListener('resize', updateResponsiveInfo);
  updateResponsiveInfo();

  console.log('✅ All features initialized successfully');
});
