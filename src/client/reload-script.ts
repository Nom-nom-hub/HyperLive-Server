export function injectReloadScript(
  htmlContent: string,
  showOverlay: boolean = true
): string {
  const reloadScript = generateReloadScript(showOverlay);

  // Check if the script is already injected
  if (htmlContent.includes('advanced-live-server-reload')) {
    return htmlContent;
  }

  // Inject the script before the closing </head> tag
  if (htmlContent.includes('</head>')) {
    return htmlContent.replace('</head>', `${reloadScript}\n</head>`);
  }

  // If no </head> tag, inject at the beginning
  return `${reloadScript}\n${htmlContent}`;
}

function generateReloadScript(showOverlay: boolean): string {
  return `
    <script>
    (function() {
        'use strict';
        
        // Advanced Live Server Reload Script
        const RELOAD_SCRIPT_ID = 'advanced-live-server-reload';
        
        // Prevent multiple injections
        if (document.getElementById(RELOAD_SCRIPT_ID)) {
            return;
        }
        
        const script = document.createElement('script');
        script.id = RELOAD_SCRIPT_ID;
        script.innerHTML = \`
            (function() {
                'use strict';
                
                let ws = null;
                let reconnectAttempts = 0;
                const maxReconnectAttempts = 5;
                const reconnectDelay = 1000;
                
                // Expose WebSocket status globally for the test app
                window.liveServerWebSocket = null;
                window.liveServerStatus = 'disconnected';
                
                // Overlay for notifications
                let overlay = null;
                ${
                  showOverlay
                    ? `
                function createOverlay() {
                    if (overlay) return overlay;
                    
                    overlay = document.createElement('div');
                    overlay.id = 'advanced-live-server-overlay';
                    overlay.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; pointer-events: none;';
                    document.body.appendChild(overlay);
                    return overlay;
                }
                
                function showNotification(message, type, duration) {
                    duration = duration || 3000;
                    type = type || 'info';
                    
                    const overlay = createOverlay();
                    
                    const notification = document.createElement('div');
                    const bgColor = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db';
                    notification.style.cssText = 'background: ' + bgColor + '; color: white; padding: 12px 16px; border-radius: 6px; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: auto; cursor: pointer; transition: opacity 0.3s ease; max-width: 300px; word-wrap: break-word;';
                    notification.textContent = message;
                    
                    notification.addEventListener('click', function() {
                        notification.style.opacity = '0';
                        setTimeout(function() { notification.remove(); }, 300);
                    });
                    
                    overlay.appendChild(notification);
                    
                    setTimeout(function() {
                        if (notification.parentNode) {
                            notification.style.opacity = '0';
                            setTimeout(function() { notification.remove(); }, 300);
                        }
                    }, duration);
                }
                `
                    : `
                function showNotification(message, type, duration) {
                    duration = duration || 3000;
                    type = type || 'info';
                    console.log('[' + type.toUpperCase() + '] ' + message);
                }
                `
                }
                
                function connectWebSocket() {
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const wsUrl = protocol + '//' + window.location.host;
                    
                    console.log('🔧 Attempting WebSocket connection to:', wsUrl);
                    console.log('🔧 Current location:', window.location.href);
                    
                    try {
                        ws = new WebSocket(wsUrl);
                        
                        ws.onopen = function() {
                            console.log('🔗 Connected to Advanced Live Server');
                            console.log('🔗 WebSocket readyState:', ws.readyState);
                            reconnectAttempts = 0;
                            window.liveServerWebSocket = ws;
                            window.liveServerStatus = 'connected';
                            showNotification('Connected to Live Server', 'success', 2000);
                        };
                        
                        // --- Live Collaboration Client ---
                        window.liveCollab = {
                            ws: null,
                            docId: null,
                            userId: null,
                            state: {},
                            connect: function(docId, userId) {
                                this.docId = docId;
                                this.userId = userId;
                                if (!ws || ws.readyState !== WebSocket.OPEN) {
                                    showNotification('Collab: Not connected to server', 'error', 3000);
                                    return;
                                }
                                // Request current state
                                ws.send(JSON.stringify({ channel: 'collab', type: 'get-state', docId, userId }));
                            },
                            sendEdit: function(content) {
                                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                                ws.send(JSON.stringify({ channel: 'collab', type: 'doc-sync', docId: this.docId, userId: this.userId, content }));
                            },
                            sendCursor: function(cursor) {
                                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                                ws.send(JSON.stringify({ channel: 'collab', type: 'cursor-sync', docId: this.docId, userId: this.userId, cursor }));
                            },
                            addComment: function(comment) {
                                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                                ws.send(JSON.stringify({ channel: 'collab', type: 'comment-add', docId: this.docId, userId: this.userId, comment }));
                            },
                            removeComment: function(comment) {
                                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                                ws.send(JSON.stringify({ channel: 'collab', type: 'comment-remove', docId: this.docId, userId: this.userId, comment }));
                            },
                            onState: function(cb) { this._onState = cb; },
                            onEdit: function(cb) { this._onEdit = cb; },
                            onCursor: function(cb) { this._onCursor = cb; },
                            onComment: function(cb) { this._onComment = cb; },
                        };

                        // Listen for collab messages
                        function handleCollabMessage(data) {
                            if (!data || data.channel !== 'collab') return;
                            if (data.type === 'state' && window.liveCollab._onState) {
                                window.liveCollab.state = data;
                                window.liveCollab._onState(data);
                            } else if (data.type === 'doc-sync' && window.liveCollab._onEdit) {
                                window.liveCollab._onEdit(data);
                            } else if (data.type === 'cursor-sync' && window.liveCollab._onCursor) {
                                window.liveCollab._onCursor(data);
                            } else if ((data.type === 'comment-add' || data.type === 'comment-remove') && window.liveCollab._onComment) {
                                window.liveCollab._onComment(data);
                            }
                        }

                        // Patch ws.onmessage to handle collab
                        const origOnMessage = ws.onmessage;
                        ws.onmessage = function(event) {
                            try {
                                const data = JSON.parse(event.data);
                                handleCollabMessage(data);
                                if (data.type === 'reload') {
                                    console.log('📝 File changed: ' + data.file);
                                    showNotification('Reloading... (' + data.file + ')', 'info', 2000);
                                    setTimeout(function() { window.location.reload(); }, 100);
                                }
                            } catch (error) {
                                if (origOnMessage) origOnMessage.call(ws, event);
                            }
                        };
                        
                        ws.onmessage = function(event) {
                            try {
                                const data = JSON.parse(event.data);
                                
                                if (data.type === 'reload') {
                                    console.log('📝 File changed: ' + data.file);
                                    showNotification('Reloading... (' + data.file + ')', 'info', 2000);
                                    
                                    // Small delay to show the notification
                                    setTimeout(function() {
                                        window.location.reload();
                                    }, 100);
                                }
                            } catch (error) {
                                console.error('Failed to parse WebSocket message:', error);
                            }
                        };
                        
                        ws.onclose = function() {
                            console.log('🔌 Disconnected from Advanced Live Server');
                            window.liveServerWebSocket = null;
                            window.liveServerStatus = 'disconnected';
                            
                            if (reconnectAttempts < maxReconnectAttempts) {
                                reconnectAttempts++;
                                showNotification('Reconnecting... (attempt ' + reconnectAttempts + ')', 'info', 2000);
                                
                                setTimeout(function() {
                                    connectWebSocket();
                                }, reconnectDelay * reconnectAttempts);
                            } else {
                                showNotification('Connection lost. Please refresh the page.', 'error', 5000);
                            }
                        };
                        
                        ws.onerror = function(error) {
                            console.error('WebSocket error:', error);
                            console.error('WebSocket readyState:', ws.readyState);
                        };
                        
                    } catch (error) {
                        console.error('Failed to connect to WebSocket:', error);
                    }
                }
                
                // Connect when DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', connectWebSocket);
                } else {
                    connectWebSocket();
                }
                
                // Reconnect on page visibility change
                document.addEventListener('visibilitychange', function() {
                    if (!document.hidden && (!ws || ws.readyState !== WebSocket.OPEN)) {
                        connectWebSocket();
                    }
                });
                
                // Error handling
                window.addEventListener('error', function(event) {
                    showNotification('JavaScript Error: ' + event.message, 'error', 5000);
                });
                
                // Console log interceptor disabled - was too intrusive
                // Uncomment the lines below if you want to see console errors as notifications
                /*
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.log = function() {
                    originalLog.apply(console, arguments);
                    if (arguments.length > 0 && typeof arguments[0] === 'string' && arguments[0].includes('error')) {
                        showNotification(Array.prototype.join.call(arguments, ' '), 'error', 5000);
                    }
                };
                
                console.error = function() {
                    originalError.apply(console, arguments);
                    showNotification(Array.prototype.join.call(arguments, ' '), 'error', 5000);
                };
                
                console.warn = function() {
                    originalWarn.apply(console, arguments);
                    showNotification(Array.prototype.join.call(arguments, ' '), 'info', 3000);
                };
                */
                
            })();
        \`;
        
        document.head.appendChild(script);
    })();
    </script>
    `;
}
