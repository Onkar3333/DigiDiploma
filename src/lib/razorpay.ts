// Razorpay payment integration utility

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      existingScript.addEventListener('load', () => {
        clearInterval(checkInterval);
        resolve();
      });
      existingScript.addEventListener('error', () => {
        clearInterval(checkInterval);
        reject(new Error('Failed to load Razorpay script'));
      });
      return;
    }

    // Create and load script - use the latest stable version
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      // Wait a bit to ensure Razorpay is fully initialized
      setTimeout(() => {
        if (window.Razorpay) {
          resolve();
        } else {
          reject(new Error('Razorpay SDK loaded but not available'));
        }
      }, 100);
    };
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
};

// Initialize Razorpay payment
export const initializePayment = async (
  orderId: string,
  amount: number,
  currency: string,
  keyId: string,
  materialTitle: string,
  userName?: string,
  userEmail?: string
): Promise<RazorpayResponse> => {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay SDK not loaded');
  }

  // Validate inputs
  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    throw new Error('Invalid order ID');
  }
  
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid payment amount');
  }
  
  if (!keyId || typeof keyId !== 'string' || keyId.trim() === '') {
    throw new Error('Invalid Razorpay key ID');
  }

  // Ensure amount is an integer (Razorpay expects integer in smallest currency unit)
  const amountInSmallestUnit = Math.round(amount);

  return new Promise<RazorpayResponse>((resolve, reject) => {
    try {
      // Validate and sanitize inputs
      const sanitizedKeyId = keyId.trim();
      const sanitizedOrderId = orderId.trim();
      
      // Ensure key starts with rzp_live_ or rzp_test_
      if (!sanitizedKeyId.startsWith('rzp_live_') && !sanitizedKeyId.startsWith('rzp_test_')) {
        reject(new Error('Invalid Razorpay key format. Key must start with rzp_live_ or rzp_test_'));
        return;
      }

      // Ensure order ID is valid and starts with 'order_'
      if (!sanitizedOrderId || sanitizedOrderId.length < 10) {
        reject(new Error('Invalid order ID format'));
        return;
      }

      // Validate order ID format (Razorpay order IDs typically start with 'order_')
      if (!sanitizedOrderId.startsWith('order_')) {
        console.warn('⚠️ Order ID does not start with "order_":', sanitizedOrderId);
        // Don't reject, as some order IDs might have different formats
      }

      // Validate amount is reasonable (minimum 100 paise = ₹1)
      if (amountInSmallestUnit < 100) {
        reject(new Error('Payment amount must be at least ₹1.00 (100 paise)'));
        return;
      }

      // Validate currency
      if (currency && currency !== 'INR') {
        console.warn('⚠️ Non-INR currency detected:', currency);
      }

      // Log payment initialization for debugging
      console.log('🚀 Initializing Razorpay payment:', {
        orderId: sanitizedOrderId,
        orderIdLength: sanitizedOrderId.length,
        amount: amountInSmallestUnit,
        amountInRupees: (amountInSmallestUnit / 100).toFixed(2),
        currency: currency || 'INR',
        keyIdPrefix: sanitizedKeyId.substring(0, 12) + '...',
        keyIdLength: sanitizedKeyId.length
      });

      // Sanitize description to remove any special characters that might cause issues with Razorpay v2 API
      const sanitizeDescription = (text: string): string => {
        if (!text) return 'Material Purchase';
        // Remove emojis and special characters, keep only alphanumeric, spaces, and basic punctuation
        return text
          .replace(/[^\w\s\-.,!?()]/g, '') // Remove special chars except basic punctuation
          .substring(0, 100)
          .trim() || 'Material Purchase';
      };

      // Build Razorpay options - ensure all required fields are present
      const options: RazorpayOptions = {
        key: sanitizedKeyId,
        amount: amountInSmallestUnit, // Must be in paise (smallest currency unit)
        currency: currency || 'INR',
        name: 'DigiDiploma',
        description: sanitizeDescription(materialTitle || 'Material Purchase'),
        order_id: sanitizedOrderId, // Must be a valid Razorpay order ID (typically starts with 'order_')
        prefill: {
          ...(userName?.trim() && { name: userName.trim().substring(0, 100) }),
          ...(userEmail?.trim() && { email: userEmail.trim().substring(0, 100) }),
        },
        theme: {
          color: '#3b82f6',
        },
        handler: (response: RazorpayResponse) => {
          console.log('✅ Payment successful:', {
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature ? 'present' : 'missing'
          });
          // Validate response
          if (!response || !response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
            console.error('❌ Invalid payment response:', response);
            reject(new Error('Invalid payment response from Razorpay'));
            return;
          }
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            console.log('⚠️ Payment modal dismissed by user');
            reject(new Error('Payment cancelled by user'));
          },
        },
      };

      // Final validation before initializing
      console.log('📋 Razorpay options prepared:', {
        hasKey: !!options.key,
        keyLength: options.key.length,
        amount: options.amount,
        currency: options.currency,
        hasOrderId: !!options.order_id,
        orderIdLength: options.order_id.length,
        hasHandler: !!options.handler
      });

      // Validate Razorpay is available
      if (!window.Razorpay || typeof window.Razorpay !== 'function') {
        reject(new Error('Razorpay SDK is not available. Please refresh the page and try again.'));
        return;
      }

      try {
        const razorpay = new window.Razorpay(options);
        
        // Add error handlers
        razorpay.on('payment.failed', (response: any) => {
          console.error('❌ Payment failed:', {
            error: response.error,
            code: response.error?.code,
            description: response.error?.description,
            source: response.error?.source,
            step: response.error?.step,
            reason: response.error?.reason
          });
          reject(new Error(response.error?.description || response.error?.reason || 'Payment failed'));
        });

        // Add additional error handlers for better debugging
        razorpay.on('payment.authorized', () => {
          console.log('✅ Payment authorized');
        });

        console.log('🎯 Opening Razorpay checkout...');
        razorpay.open();
      } catch (initError: any) {
        console.error('❌ Error creating Razorpay instance:', {
          error: initError,
          message: initError?.message,
          stack: initError?.stack
        });
        reject(new Error(`Failed to initialize Razorpay: ${initError?.message || 'Unknown error'}`));
      }
    } catch (error: any) {
      console.error('Razorpay initialization error:', error);
      reject(new Error(error?.message || 'Failed to initialize payment'));
    }
  });
};

