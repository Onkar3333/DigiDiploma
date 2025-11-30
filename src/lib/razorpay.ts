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
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay script')));
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
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
      const options: RazorpayOptions = {
        key: keyId.trim(),
        amount: amountInSmallestUnit,
        currency: currency || 'INR',
        name: 'DigiDiploma',
        description: `Purchase: ${materialTitle.substring(0, 100)}`, // Limit description length
        order_id: orderId.trim(),
        prefill: {
          name: userName?.trim() || '',
          email: userEmail?.trim() || '',
        },
        theme: {
          color: '#3b82f6',
        },
        handler: (response: RazorpayResponse) => {
          // Validate response
          if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
            reject(new Error('Invalid payment response from Razorpay'));
            return;
          }
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      reject(error);
    }
  });
};

