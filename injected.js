// injected.js
(function() {
    // Configuration
    const TARGET_URL = 'https://rapidapi.com/gateway/graphql';
    const TARGET_OPERATION = 'getFullApiEndpoint';

    // ================== UI Setup ==================
    // Add overlay styles
    const style = document.createElement('style');
    style.textContent = `
        .api-date-overlay {
            position: fixed;
            bottom: 20px;
            right: 0px;
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            max-width: 300px;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .api-date-overlay strong {
            color: #00ff9d;
            display: block;
            margin-bottom: 5px;
            font-size: 15px;
        }
        .api-date-overlay small {
            display: block;
            margin-top: 8px;
            opacity: 0.7;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'api-date-overlay';
    document.body.appendChild(overlay);

    // ================== Core Functionality ==================
    function updateOverlay(createdAt) {
        try {
            const createdDate = new Date(createdAt);
            const currentDate = new Date();
            
            // Calculate time difference
            const timeDiff = currentDate - createdDate;
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            const years = Math.floor(months / 12);
    
            // Build age string
            let ageString;
            if (years > 0) {
                const remainingMonths = months % 12;
                ageString = `${years} ${years === 1 ? 'year' : 'years'}`;
                if (remainingMonths > 0) {
                    ageString += ` ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
                }
            } else if (months > 0) {
                const remainingDays = days % 30;
                ageString = `${months} ${months === 1 ? 'month' : 'months'}`;
                if (remainingDays > 0) {
                    ageString += ` ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
                }
            } else {
                ageString = `${days} ${days === 1 ? 'day' : 'days'}`;
            }
    
            // Format original date
            const formattedDate = createdDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
            
            overlay.innerHTML = `
                <strong>API Endpoint Age</strong>
                <div style="color: #00ff9d; font-size: 18px; margin: 8px 0;">${ageString} old</div>
                <div style="opacity: 0.8; font-size: 13px;">
                    Created: ${formattedDate}
                </div>
                <small style="display: block; margin-top: 8px;">Updated automatically via network interception</small>
            `;
        } catch(e) {
            console.error('Date processing error:', e);
        }
    }
    // function updateOverlay(createdAt) {
    //     try {
    //         const date = new Date(createdAt);
    //         const formattedDate = date.toLocaleString('en-US', {
    //             year: 'numeric',
    //             month: 'short',
    //             day: 'numeric',
    //             hour: '2-digit',
    //             minute: '2-digit',
    //             second: '2-digit',
    //             timeZoneName: 'short'
    //         });
            
    //         overlay.innerHTML = `
    //             <strong>API Creation Date</strong>
    //             ${formattedDate}
    //             <small>Auto-updated from network requests</small>
    //         `;
    //     } catch(e) {
    //         console.error('Date formatting error:', e);
    //     }
    // }

    // ================== XMLHttpRequest Interception ==================
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._method = method;
        this._url = url;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(postData) {
        const isTarget = this._url === TARGET_URL && 
                        postData && 
                        postData.includes(TARGET_OPERATION);

        if(isTarget) {
            const startTime = Date.now();
            
            this.addEventListener('load', () => {
                try {
                    const responseData = JSON.parse(this.responseText);
                    if(responseData?.data?.endpoint?.createdAt) {
                        updateOverlay(responseData.data.endpoint.createdAt);
                    }
                    
                    // console.log('[XHR Capture]', {
                    //     url: this._url,
                    //     status: this.status,
                    //     duration: Date.now() - startTime + 'ms',
                    //     request: JSON.parse(postData),
                    //     response: responseData
                    // });
                } catch(e) {
                    console.error('XHR Processing Error:', e);
                }
            });
        }
        
        return originalXHRSend.apply(this, arguments);
    };

    // ================== Fetch API Interception ==================
    const originalFetch = window.fetch;

    window.fetch = async function(input, init) {
        const request = new Request(input, init);
        const startTime = Date.now();
        
        try {
            const clonedRequest = request.clone();
            const requestBody = await clonedRequest.text();
            
            if(request.url === TARGET_URL && requestBody.includes(TARGET_OPERATION)) {
                const response = await originalFetch(request);
                const responseClone = response.clone();
                
                try {
                    const responseData = await responseClone.json();
                    if(responseData?.data?.endpoint?.createdAt) {
                        updateOverlay(responseData.data.endpoint.createdAt);
                    }
                    
                    // console.log('[Fetch Capture]', {
                    //     url: request.url,
                    //     status: response.status,
                    //     duration: Date.now() - startTime + 'ms',
                    //     request: {
                    //         method: request.method,
                    //         headers: Object.fromEntries(request.headers.entries()),
                    //         body: JSON.parse(requestBody)
                    //     },
                    //     response: responseData
                    // });
                } catch(e) {
                    console.error('Fetch Response Parsing Error:', e);
                }
                
                return response;
            }
        } catch(e) {
            console.error('Fetch Interception Error:', e);
        }
        
        return originalFetch(input, init);
    };

    console.log('Request interceptor successfully initialized');
})();


// // injected.js
// (function () {
//   const TARGET_URL = "https://rapidapi.com/gateway/graphql";
//   const TARGET_OPERATION = "getFullApiEndpoint";

//   // ======== XMLHttpRequest Interception ========
//   const originalXHROpen = XMLHttpRequest.prototype.open;
//   const originalXHRSend = XMLHttpRequest.prototype.send;

//   XMLHttpRequest.prototype.open = function (method, url) {
//     this._method = method;
//     this._url = url;
//     return originalXHROpen.apply(this, arguments);
//   };

//   XMLHttpRequest.prototype.send = function (postData) {
//     const isTarget =
//       this._url === TARGET_URL &&
//       postData &&
//       postData.includes(TARGET_OPERATION);

//     if (isTarget) {
//       const startTime = Date.now();
//       this.addEventListener("load", function () {
//         const duration = Date.now() - startTime;
//         try {
//           console.log("[XHR Capture]", {
//             type: "xhr",
//             url: this._url,
//             status: this.status,
//             duration: `${duration}ms`,
//             request: JSON.parse(postData),
//             response: JSON.parse(this.responseText),
//           });
//         } catch (e) {
//           console.error("XHR Parse Error:", e);
//         }
//       });
//     }
//     return originalXHRSend.apply(this, arguments);
//   };

//   // ======== Fetch API Interception ========
//   const originalFetch = window.fetch;

//   window.fetch = async function (input, init) {
//     const startTime = Date.now();
//     const request = new Request(input, init);
//     const isGraphQL = request.url.includes(TARGET_URL);

//     try {
//       // Clone request to safely read body
//       const clonedRequest = request.clone();
//       const requestBody = await clonedRequest.text();

//       if (isGraphQL && requestBody.includes(TARGET_OPERATION)) {
//         const response = await originalFetch(request);
//         const duration = Date.now() - startTime;
//         const responseClone = response.clone();

//         console.log("[Fetch Capture]", {
//           url: request.url,
//           status: response.status,
//           duration: `${duration}ms`,
//           request: {
//             method: request.method,
//             headers: Object.fromEntries(request.headers.entries()),
//             body: JSON.parse(requestBody),
//           },
//           response: await responseClone.json(),
//         });

//         return response;
//       }
//       return originalFetch(request);
//     } catch (e) {
//       console.error("Fetch Interception Error:", e);
//       return originalFetch(request);
//     }
//   };

//   async function parseRequest(request) {
//     try {
//       return {
//         method: request.method,
//         headers: Object.fromEntries(request.headers.entries()),
//         body: await request.text(),
//       };
//     } catch (e) {
//       return { error: "Failed to parse request" };
//     }
//   }

//   console.log("Interceptor activated successfully");
// })();
